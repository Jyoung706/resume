from enum import StrEnum, unique


class GPT_MESSAGES(StrEnum):
    """
    gpt message string enum
    """

    model_description = "ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API."
    max_tokens_description = "The maximum number of tokens to generate in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length."
    temperature_description = "What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both."
    top_p_description = "An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both."
    presence_penalty_description = "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics."
    frequency_penalty_description = "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim."
    context_unit_description = "The unit of conversation. For 1:1 conversations, enter the user's unique username, and for Slack, enter thread_ts as the conversation is threaded."
    number_of_messages_to_keep_description = "Parameter that specifies the number of messages to store in the conversation history. Keeping history allows you to answer questions about previous conversations. However, we don't recommend storing a lot of conversation history because the maximum token is 4096. Also, this setting requires Redis, an in-memory database."


@unique
class GPT_MODELS(StrEnum):
    """
    supply gpt model string enum
    """

    gpt_4_1106_preview = "gpt-4-1106-preview"
    gpt_4_vision_preview = "gpt-4-vision-preview"
    gpt_4 = "gpt-4"
    gpt_4_0314 = "gpt-4-0314"
    gpt_4_0613 = "gpt-4-0613"
    gpt_4_32k = "gpt-4-32k"
    gpt_4_32k_0314 = "gpt-4-32k-0314"
    gpt_4_32k_0613 = "gpt-4-32k-0613"
    gpt_3_5_turbo_1106 = "gpt-3.5-turbo-1106"
    gpt_3_5_turbo = "gpt-3.5-turbo"
    gpt_3_5_turbo_16k = "gpt-3.5-turbo-16k"
    gpt_3_5_turbo_0301 = "gpt-3.5-turbo-0301"
    gpt_3_5_turbo_0613 = "gpt-3.5-turbo-0613"
    gpt_3_5_turbo_16k_0613 = "gpt-3.5-turbo-16k-0613"
    gpt_4o = "gpt-4o"
    gpt_4o_mini = "gpt-4o-mini"


@unique
class GPT_ROLE_TYPE(StrEnum):
    """
    GPT Message Role types string Enum
        system = system config message
        assistant = assistant message for user type message ( ask history should be this type )
        user = ask message
    """

    system = "system"
    assistant = "assistant"
    user = "user"


@unique
class GPT_CHAT_PROMPT_ROLE(StrEnum):
    """
    GPT Message Role types string Enum For LangChain ChatPromptTemplate
        system = system config message
        assistant = assistant message for user type message ( ask history should be this type )
        user,human = ask message
    """

    system = "system"
    ai = "ai"
    human = "human"
    # can support this?
    assistant = "assistant"
    user = "user"
