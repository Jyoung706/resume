import copy
from typing import Any, Dict, List, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.sql_meta_info import SQLMetaInfo
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class Evaluate(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.scores = []
        self.comparison_matrix = []
        self.SQL_id = None

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        # [CHECK] 추후 성능 체크 필요 (deep copy)
        SQL_meta_infos = copy.deepcopy(state.SQL_meta_infos)

        try:
            key_to_evaluate = list(SQL_meta_infos.keys())[-1]
            target_SQL_meta_infos = SQL_meta_infos[key_to_evaluate]
        except Exception as e:
            exec_logger.error(f"Error in UnitTestEvaluator: {e}")
            return
        if key_to_evaluate.startswith(self.work_name):
            id = int(key_to_evaluate[len(self.work_name) + 1 :])
            self.SQL_id = self.work_name + "_" + str(id + 1)
        else:
            self.SQL_id = self.work_name + "_1"
        SQL_meta_infos[self.SQL_id] = []
        request_list = []
        if len(target_SQL_meta_infos) == 0:
            SQL_meta_infos[self.SQL_id].append("SELECT * FROM table_name")
            self.scores = [0]
            self.comparison_matrix = [[0]]
            return {"SQL_meta_infos": SQL_meta_infos}, []
        if len(target_SQL_meta_infos) == 1:
            SQL_meta_infos[self.SQL_id].append(target_SQL_meta_infos[0])
            self.scores = [1]
            self.comparison_matrix = [[1]]
            return {"SQL_meta_infos": SQL_meta_infos}, []
        if len(state.unit_tests["unit_test_generation"]) == 0:
            SQL_meta_infos[self.SQL_id].append(target_SQL_meta_infos[0])
            self.scores = [1]
            self.comparison_matrix = [[1]]
            return {"SQL_meta_infos": SQL_meta_infos}, []

        candidates_clusters = self.execution_based_clustering(target_SQL_meta_infos)
        formatted_candidates = ""
        for index, candidate_query in enumerate(target_SQL_meta_infos):
            formatted_candidates += f"Candidate Response #{index + 1}: Query: {candidate_query.SQL}\n, Execution Result: {self._format_sql_query_result(candidate_query)}\n"
        database_schema = state.get_database_schema_for_queries(
            [sql_meta_info.SQL for sql_meta_info in target_SQL_meta_infos]
        )
        for index, unit_test in enumerate(state.unit_tests["unit_test_generation"]):
            try:
                request_kwargs = {
                    "DATABASE_SCHEMA": database_schema,
                    "QUESTION": state.rewritten_question,
                    "HINT": state.task.evidence,
                    "CANDIDATE_RESPONSES": formatted_candidates,
                    "UNIT_TEST": unit_test,
                }
                request_list.append(request_kwargs)
            except Exception as e:
                exec_logger.error(
                    f"Error in UnitTestEvaluator while creating request list: {e}"
                )
                continue

        try:
            llm_actor = get_llm_actor()

            response = await llm_actor.llm_chain_calls.remote(
                template_name=self.template_name,
                engine_config={
                    **self.engine_config,
                    "api_key": state.task.api_key,
                    "streaming": self.streaming,
                    "chat_id": state.task.chat_id,
                    "proc_id": self.proc_id,
                },
                parser_name=self.parser_name,
                request_list=request_list,
                step=self.work_name,
            )

            messages = [r[0][1] for r in response]
            messages = [msg for msglist in messages for msg in msglist]

            response = [r[0][0] for r in response]
        except Exception as e:
            exec_logger.error(f"Error in Checker while getting response: {e}")
            response = []
            messages = []

        comparison_matrix = []
        for item in response:
            # if self.test_case_filtering_based_on_inter_cluster_variance(candidates_clusters, item["scores"], target_SQL_meta_infos):
            comparison_matrix.append(item["scores"])

        # sum scores across all unit tests
        self.comparison_matrix = comparison_matrix
        scores = [
            sum([score[index] for score in comparison_matrix])
            for index in range(len(comparison_matrix[0]))
        ]
        self.scores = scores

        # find the best candidate
        best_candidate = self.pick_the_best_candidate(
            scores, target_SQL_meta_infos, candidates_clusters
        )
        SQL_meta_infos[self.SQL_id].append(best_candidate)

        return {"SQL_meta_infos": SQL_meta_infos}, messages

    def self_consistency(self, candidate_clusters: Dict) -> SQLMetaInfo:
        """
        picks the candidate with the largest cluster.

        Args:
            candidates_clusters (Dict): The clusters of the candidates.
        """
        largest_cluster = max(
            candidate_clusters, key=lambda x: len(candidate_clusters[x])
        )
        return candidate_clusters[largest_cluster][0]

    def test_case_filtering_based_on_inter_cluster_variance(
        self,
        candidates_clusters: Dict,
        scores: List[int],
        target_SQL_meta_infos: List[SQLMetaInfo],
    ) -> bool:
        """
        Filters the test cases based on the inter-cluster variance.

        Args:
            candidates_clusters (Dict): The clusters of the candidates.
            scores (List[int]): The scores of the candidates.
            target_SQL_meta_infos (List[SQLMetaInfo]): The target SQL meta information.
        """
        for key, candidates in candidates_clusters.items():
            cluster_scores = [
                scores[target_SQL_meta_infos.index(candidate)]
                for candidate in candidates
            ]
            if len(set(cluster_scores)) > 1:
                return False
        return True

    def pick_the_best_candidate(
        self, scores: List[int], candidates: List[SQLMetaInfo], candidate_clusters: Dict
    ) -> SQLMetaInfo:
        """
        Picks the best candidate based on the scores.

        Args:
            scores (List[int]): The scores of the candidates.
            candidates (List[SQLMetaInfo]): The candidates.
            candidate_clusters (Dict): The clusters of the candidates.
        """
        largest_cluster = max(
            candidate_clusters, key=lambda x: len(candidate_clusters[x])
        )
        max_score = max(scores)
        best_candidates = [
            candidates[index]
            for index, score in enumerate(scores)
            if score == max_score
        ]
        if len(best_candidates) == 1:
            return best_candidates[0]
        for candidate in best_candidates:
            if candidate in candidate_clusters[largest_cluster]:
                return candidate
        return best_candidates[0]

    def _format_sql_query_result(self, sql_meta_info: SQLMetaInfo) -> str:
        """
        Formats the SQL query to pass to the picker model.

        Args:
            sql_meta_info (SQLMetaInfo): The SQL meta information.
        """
        try:
            execution_result = sql_meta_info.execution_result
            if execution_result is None:
                return "No results"
            if not isinstance(execution_result, list):
                execution_result = list(execution_result)
            number_of_rows = len(execution_result)
            if number_of_rows == 0:
                number_of_columns = 0
            else:
                number_of_columns = len(execution_result[0])
            if number_of_rows > 20:
                execution_result = execution_result[:20]
            formatted_result = (
                f"Rows: {number_of_rows}, Columns: {number_of_columns}, Results:"
                f" {execution_result}"
            )
        except Exception as e:
            formatted_result = f"Error: {e}"
        return formatted_result

    def execution_based_clustering(self, candidate_queries: List[SQLMetaInfo]) -> list:
        """
        Clusters the generated candidates based on the execution results.

        Args:
            state (SystemState): The current system state.
        """
        clusters = {}
        for query in candidate_queries:
            try:
                result = (
                    str(query.execution_result)
                    if isinstance(query.execution_result, str)
                    else repr(query.execution_result)
                )
            except Exception:
                continue
            if result not in clusters:
                clusters[result] = []
            clusters[result].append(query)
        # sample one query from each cluster
        return clusters

    def _get_updates(self, input_state: SystemState, result: Dict[str, Any]) -> Dict:
        # update evaluation result
        # [CHECK] 추후에 여러 결과 도출 되도록 수정 필요함. 그리고 지금 뭔가 계산이 이상함. score 가 있는데 왜 고정해서 가져오지?

        SQL_meta_infos = result["SQL_meta_infos"]
        key_to_evaluate = list(SQL_meta_infos.keys())[-2]
        target_SQL_meta_infos = SQL_meta_infos[key_to_evaluate]

        evaluation_result = {
            "scores": self.scores,
            "comparison_matrix": self.comparison_matrix,
            "candidates": [
                sql_meta_info.SQL for sql_meta_info in target_SQL_meta_infos
            ],
            "selected_candidate": SQL_meta_infos[self.SQL_id][0].SQL,
        }

        self.scores = []
        self.comparison_matrix = []
        self.SQL_id = None
        
        return {"evaluation_result": evaluation_result}
