from typing import Any, Dict, Set
from langgraph.graph import StateGraph, START, END
from functools import partial

from langgraph.checkpoint.memory import MemorySaver

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.conf.worker_conf.worker_config import EdgeConfig, WorkerConfig
from tts_workflow.core.static.work_enum import EDGE_TYPE, NODE
from tts_workflow.core.utils.load import import_module
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput


class WorkerBuilder:
    def __init__(self, config: WorkerConfig):
        self.worker = StateGraph(SystemState)
        self.config = config

    def build(self):
        self._add_nodes()
        self._add_edges()

    def _add_nodes(self):
        works = self.config.works

        # import debugpy

        # debugpy.listen(("0.0.0.0", 9002))
        # debugpy.wait_for_client()

        for work_name, work_config in works.items():
            try:
                proc_id = None

                for pInd, proc in enumerate(self.config.procs):
                    if work_name in proc.works:
                        proc_id = pInd
                        break
                
                # if proc_id is None:
                #     raise ValueError(f"Porceess and Wrorker Node is not matched.")
                work_input = WorkInput(
                    work_name=work_name,
                    proc_id=proc_id,
                    streaming=work_config.streaming)
                
                work = import_module(
                    work_config.import_path, self.config.root_import_path
                )(work_input, **work_config.args)

                self.worker.add_node(work_name, work)
            except Exception as e:
                exec_logger.error(f"Error adding node {work_name}: {e}")

    def _add_edges(self):
        edges = self.config.edges

        # Start Node
        self.worker.add_edge(START, edges[0].src)

        all_nodes = set(self.config.works.keys())
        linked_nodes = set()

        for edge in edges:
            try:
                if edge.type == EDGE_TYPE.normal:
                    linked_node_name = self._add_normal_edge(edge)
                elif edge.type == EDGE_TYPE.conditional:
                    linked_node_name = self._add_conditional_edge(edge)
                elif edge.type == EDGE_TYPE.recursive:
                    linked_node_name = self._add_recursive_edge(edge)
                linked_nodes.add(linked_node_name)
            except Exception as e:
                exec_logger.error(f"Error adding edge {edge.type}: {e}")

        # 연결 노드가 없는 Edge End 추가
        for not_linked_node in all_nodes - linked_nodes:
            if not_linked_node == NODE.final:
                self.worker.add_edge(not_linked_node, END)
            else:
                self.worker.add_edge(not_linked_node, NODE.final)

    def _add_normal_edge(self, edge: EdgeConfig) -> str:
        self.worker.add_edge(edge.src, edge.dst)
        return edge.src

    def _add_conditional_edge(self, edge: EdgeConfig) -> str:
        self._linked_end_node(edge.dsts)  # end 노드 연결 (객체 직접 수정정)

        source = import_module(
            self.config.works[edge.src].import_path, self.config.root_import_path
        )
        self.worker.add_conditional_edges(edge.src, source.route, edge.dsts)

        return edge.src

    def _add_recursive_edge(self, edge: EdgeConfig) -> str:
        source = import_module(
            self.config.works[edge.src].import_path, self.config.root_import_path
        )(edge.src)
        self.worker.add_conditional_edges(
            edge.src,
            partial(source.rcr_route, max_retry=edge.dst_rcr.max_retry),
            {
                "recursive": edge.dst_rcr.recursive,
                "next": edge.dst_rcr.next,
            },
        )

        return edge.src

    def _linked_end_node(self, dsts: Dict[str, str | None]):
        for dst_key, node in dsts.items():
            if dst_key == "end":
                dsts[dst_key] = NODE.final
                return

            if node is None:
                dsts[dst_key] = NODE.final
                return

            if node == "end":
                dsts[dst_key] = NODE.final
                return


def build_worker(
    worker_config: WorkerConfig, download_graph: bool = False
) -> StateGraph:
    worker_builder = WorkerBuilder(worker_config)
    worker_builder.build()

    # compiled_worker = worker_builder.worker.compile(checkpointer=MemorySaver())
    compiled_worker = worker_builder.worker.compile()

    if download_graph:
        from langchain_core.runnables.graph import MermaidDrawMethod

        compiled_worker.get_graph().draw_mermaid_png(
            draw_method=MermaidDrawMethod.API,
            output_file_path=f"graph_{worker_config.worker_id}.png",
        )

    return compiled_worker
