"""Status caption generator: refined, understated dog-walk humor."""

import random
from dataclasses import dataclass

TARGET_OBJECTS = [
    "suspicious squirrel",
    "overly confident pigeon",
    "delivery truck",
    "fire hydrant",
    "leaf pile of consequence",
    "tennis ball behind a fence",
    "rival hound across the street",
    "abandoned bagel",
]

LOCATION_TYPES = [
    "park",
    "hydrant",
    "sidewalk",
    "tree",
    "café patio",
    "flower bed",
]

STREET_NAMES = [
    "Oak Street",
    "Maple Row",
    "Beacon Court",
    "Linden Way",
    "Harbor Lane",
    "Prescott Avenue",
    "Cedar Mews",
]

TEMPLATES = [
    "Currently auditing a suspicious {target_object} on {street_name}.",
    "Escorting the mail carrier along {street_name}.",
    "Conducting a routine inspection of the {location_type} on {street_name}.",
    "Holding a staring contest with a {target_object}.",
    "Submitting a formal complaint about the {target_object} to {street_name}.",
    "Taste-testing the breeze near the {location_type}.",
    "Presiding over the {location_type} with quiet authority.",
    "Negotiating with a {target_object} for right of way.",
]


@dataclass(frozen=True)
class StatusContext:
    """Spatial context used to seed a status caption.

    Attributes:
        street_name: Nearest street or waypoint label.
        location_type: Kind of place the subject is at.
        target_object: Notable object the subject may be reacting to.
    """

    street_name: str = "Oak Street"
    location_type: str = "park"
    target_object: str = "suspicious squirrel"


def generate_status(
    context: StatusContext | None = None,
    rng: random.Random | None = None,
) -> str:
    """Generate a single status caption from the template pool.

    Args:
        context: Optional spatial context; defaults are used when omitted.
        rng: Optional random source for deterministic testing.

    Returns:
        A rendered status caption string.
    """
    random_source = rng or random.Random()
    active = context or StatusContext()
    template = random_source.choice(TEMPLATES)
    return template.format(
        street_name=active.street_name,
        location_type=active.location_type,
        target_object=active.target_object,
    )


def shuffle_status(
    previous: str | None = None,
    rng: random.Random | None = None,
) -> str:
    """Generate a status caption distinct from the previous one.

    Args:
        previous: The caption currently displayed, avoided when possible.
        rng: Optional random source for deterministic testing.

    Returns:
        A newly generated caption, ideally different from ``previous``.
    """
    random_source = rng or random.Random()
    for _ in range(8):
        candidate = generate_status(rng=random_source)
        if candidate != previous:
            return candidate
    return generate_status(rng=random_source)
