import os
import re
from typing import Any
from langchain.prompts import (
    PromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
)

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.conf.config import config


def _load_template(template_name: str) -> str:
    """
    Loads a template from a file.

    Args:
        template_name (str): The name of the template to load.

    Returns:
        str: The content of the template.
    """

    file_name = f"template_{template_name}.txt"
    template_path = config.TEMPLATES_ROOT_PATH / file_name

    try:
        with open(template_path, "r", encoding="UTF8") as file:
            template = file.read()
        exec_logger.info(f"Template {template_name} loaded successfully.")
        return template
    except FileNotFoundError:
        exec_logger.error(f"Template file not found: {template_path}")
        raise
    except Exception as e:
        exec_logger.error(f"Error loading template {template_name}: {e}")
        raise


def _extract_input_variables(template: str) -> Any:
    pattern = r"\{(.*?)\}"
    placeholders = re.findall(pattern, template)
    return placeholders


def get_prompt(template_name: str = None, template: str = None) -> ChatPromptTemplate:
    """
    Creates a ChatPromptTemplate from a template.

    Args:
        template_name (str): The name of the template to load.
        template (str): The content of the template.

    Returns:
        ChatPromptTemplate: The prompt
    """
    if template_name:  # If template_name is provided, load the template
        template = _load_template(template_name)
    input_variables = _extract_input_variables(template)

    human_message_prompt_template = HumanMessagePromptTemplate(
        prompt=PromptTemplate(
            template=template,
            input_variables=input_variables,
        )
    )

    combined_prompt_template = ChatPromptTemplate.from_messages(
        [human_message_prompt_template]
    )

    return combined_prompt_template
