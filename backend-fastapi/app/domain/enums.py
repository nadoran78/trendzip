from enum import StrEnum


class Generation(StrEnum):
    TEEN = "TEEN"
    TWENTY = "TWENTY"


class FeedSection(StrEnum):
    TODAY_PICK = "TODAY_PICK"
    RISING = "RISING"
    RELATED = "RELATED"
