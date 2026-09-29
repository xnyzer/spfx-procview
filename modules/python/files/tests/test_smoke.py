from {{PROJECT_NAME_SNAKE}} import greet


def test_greet() -> None:
    assert greet("world") == "Hello, world!"
