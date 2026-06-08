import json
from typing import Any, Iterable, Literal
from uuid6 import uuid7
import os
import pandas as pd
import csv
from filelock import FileLock


from core.conf import config
from core.server.repository.TaskRepositoryBase import TaskRepositoryBase
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.sql_meta_info import SQLMetaInfo


class TaskFileCSVRepository(TaskRepositoryBase):
    def __init__(self, task_id: str = None):
        super().__init__()

        # tasks 저장 경로 생성
        self.root_path = config.TASK_ROOT_PATH
        os.makedirs(self.root_path, exist_ok=True)

        # status 저장 항목
        # status : pending, running, success, failed
        self.status_file_name = "status.csv"
        self.status_file_columns = ["status", "message", "created_at"]

        # history 저장 항목
        self.history_file_name = "history.csv"
        self.history_file_columns = ["historyType", "message", "created_at"]

        # 단계 별 결과 저장 항목
        self.outputs_file_name = "outputs.csv"
        self.outputs_file_columns = ["output_key", "output_value", "created_at"]

        if task_id is not None:
            # task 저장 경로 생성
            os.makedirs(os.path.join(self.root_path, task_id), exist_ok=True)

            # status 파일 생성
            self._write_csv(
                task_id,
                self.status_file_name,
                [self.status_file_columns, ["pending", "", self._getCurrentTime()]],
            )

            # history 파일 생성
            self._write_csv(
                task_id,
                self.history_file_name,
                [
                    self.history_file_columns,
                    ["init", "generate task id", self._getCurrentTime()],
                ],
            )

            # outputs 파일 생성
            self._write_csv(task_id, self.outputs_file_name, self.outputs_file_columns)

    def generate_task_id(self) -> str:
        task_id = str(uuid7())

        # task 저장 경로 생성
        os.makedirs(os.path.join(self.root_path, task_id), exist_ok=True)

        # status 파일 생성
        self._write_csv(
            task_id,
            self.status_file_name,
            [self.status_file_columns, ["pending", "", self._getCurrentTime()]],
        )

        # history 파일 생성
        self._write_csv(
            task_id,
            self.history_file_name,
            [
                self.history_file_columns,
                ["init", "generate task id", self._getCurrentTime()],
            ],
        )

        # outputs 파일 생성
        self._write_csv(task_id, self.outputs_file_name, self.outputs_file_columns)

        return task_id

    # status : pending, running, success, failed
    def insert_status(
        self,
        task_id: str,
        status: Literal["pending", "running", "success", "failed"],
        message: str = "",
    ) -> None:
        self._write_csv(
            task_id, self.status_file_name, [status, message, self._getCurrentTime()]
        )

    def insert_output(self, task_id: str, output_key: str, data: Iterable) -> None:
        if output_key == "SQL_meta_infos":
            data = {
                key: [obj.model_dump() for obj in models]
                for key, models in data.items()
            }

        if output_key == "chat_history":
            data = [chat.model_dump() for chat in data]

        selected_data = self.select_output(task_id, output_key)
        if selected_data is None:
            self._write_csv(
                task_id,
                self.outputs_file_name,
                [output_key, json.dumps(data), self._getCurrentTime()],
            )
        else:
            if type(selected_data) == list:
                if output_key == "chat_history":
                    selected_data = [chat.model_dump() for chat in selected_data]

                selected_data.extend(data)
                new_df = pd.DataFrame(
                    [[output_key, json.dumps(selected_data), self._getCurrentTime()]],
                    columns=self.outputs_file_columns,
                )
            else:
                new_df = pd.DataFrame(
                    [[output_key, json.dumps(data), self._getCurrentTime()]],
                    columns=self.outputs_file_columns,
                )

            df = self._read_csv(task_id, self.outputs_file_name)
            df = df[df["output_key"] != output_key]

            df = pd.concat([df, new_df], ignore_index=True)
            df_list = df.values.tolist()
            df_list.insert(0, self.outputs_file_columns)
            self._write_csv(task_id, self.outputs_file_name, df_list, "w")

    def select_output(self, task_id: str, output_key: str) -> Iterable:
        df = self._read_csv(task_id, self.outputs_file_name)
        df = df[df["output_key"] == output_key]
        if df.empty:
            return None
        else:
            output = json.loads(df.to_dict(orient="records")[0]["output_value"])
            if output_key == "SQL_meta_infos":
                output = {
                    key: [SQLMetaInfo(**obj) for obj in models]
                    for key, models in output.items()
                }
            if output_key == "chat_history":
                output = [Chat.model_validate(item) for item in output]

        return output

    def insert_history(self, task_id: str, history_type: str, message: str) -> None:
        self._write_csv(
            task_id,
            self.history_file_name,
            [history_type, message, self._getCurrentTime()],
        )

    def _getCurrentTime(self) -> str:
        import time

        return time.strftime("%Y%m%d%H%M%S", time.localtime())

    def _write_csv(
        self, task_id: str, file_name: str, data: Any, opt: str = "a"
    ) -> None:
        if not data or not self._is_iterable(data):
            return

        file_path = os.path.join(self.root_path, task_id, file_name)

        # unix : lock 파일 남아 있음. 제거 시점 잡기 어려움 일단은.
        with FileLock(file_path + ".lock"):
            with open(file_path, opt, encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                if self._is_iterable_of_iterable(data):
                    writer.writerows(data)
                else:
                    writer.writerow(data)

    def _read_csv(self, task_id: str, file_name: str) -> Iterable:
        file_path = os.path.join(self.root_path, task_id, file_name)
        with FileLock(file_path + ".lock"):
            return pd.read_csv(file_path, header=0)

    def _is_iterable(self, data: Any) -> bool:
        return isinstance(data, Iterable) and not isinstance(data, (str, bytes))

    def _is_iterable_of_iterable(self, data: Any) -> bool:
        return self._is_iterable(data) and all(self._is_iterable(item) for item in data)
