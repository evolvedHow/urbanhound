"""Static catalog metadata for retro filters, props, and vibe presets."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/meta", tags=["meta"])


class PropDefinition(BaseModel):
    """A decorative sticker or wearable offered by the prop kit.

    Attributes:
        prop_id: Stable identifier persisted with a photo.
        label: Human friendly name shown in the picker.
        category: Grouping used to organise the picker.
    """

    prop_id: str
    label: str
    category: str


class RetroFilter(BaseModel):
    """A 1960s-inspired color grading preset.

    Attributes:
        filter_id: Stable identifier for the preset.
        label: Human friendly name shown in the picker.
        saturation: CSS-compatible saturation multiplier.
        warmth: CSS-compatible sepia intensity.
        contrast: CSS-compatible contrast multiplier.
    """

    filter_id: str
    label: str
    saturation: float
    warmth: float
    contrast: float


class CatalogRead(BaseModel):
    """The complete set of retro filters and props.

    Attributes:
        filters: Available color grading presets.
        props: Available sticker and wearable props.
    """

    filters: list[RetroFilter]
    props: list[PropDefinition]


PROPS: list[PropDefinition] = [
    PropDefinition(
        prop_id="hat_detective_pipe",
        label="Detective Hat & Pipe",
        category="Wearables",
    ),
    PropDefinition(
        prop_id="sunglasses_retro",
        label="Retro Sunglasses",
        category="Wearables",
    ),
    PropDefinition(
        prop_id="hat_party",
        label="Party Hat",
        category="Wearables",
    ),
    PropDefinition(
        prop_id="crown",
        label="Crown",
        category="Wearables",
    ),
    PropDefinition(
        prop_id="badge_stick_champion",
        label="Stick Champion",
        category="Badges",
    ),
    PropDefinition(
        prop_id="badge_squirrel_inspector",
        label="Squirrel Inspector",
        category="Badges",
    ),
    PropDefinition(
        prop_id="badge_professional_napper",
        label="Professional Napper",
        category="Badges",
    ),
    PropDefinition(
        prop_id="badge_mud_magnet",
        label="Mud Magnet",
        category="Badges",
    ),
    PropDefinition(
        prop_id="tape_scotch",
        label="Scotch Tape Strip",
        category="Captions",
    ),
    PropDefinition(
        prop_id="tape_labelmaker",
        label="Label-Maker Tape",
        category="Captions",
    ),
]

FILTERS: list[RetroFilter] = [
    RetroFilter(
        filter_id="kodachrome",
        label="Kodachrome",
        saturation=1.15,
        warmth=0.28,
        contrast=1.08,
    ),
    RetroFilter(
        filter_id="technicolor",
        label="Technicolor",
        saturation=1.35,
        warmth=0.20,
        contrast=1.16,
    ),
    RetroFilter(
        filter_id="seventies_fade",
        label="Seventies Fade",
        saturation=0.95,
        warmth=0.35,
        contrast=0.92,
    ),
    RetroFilter(
        filter_id="kodak_gold",
        label="Kodak Gold",
        saturation=1.08,
        warmth=0.32,
        contrast=1.05,
    ),
]


@router.get("/catalog", response_model=CatalogRead)
def get_catalog() -> CatalogRead:
    """Return the retro filter and prop catalog.

    Returns:
        The static catalog used by the photo editor.
    """
    return CatalogRead(filters=FILTERS, props=PROPS)
