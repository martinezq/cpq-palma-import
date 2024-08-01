# Backlog

## [CLOSED] Problem with palma_squeegee_blade_module

In module palma_squeegee_blade_module, variants with 40" scrubbing width don't work in MLI assembly

Domain elements with "?" (Small?) - what is this?

Problem with unifier logic - some should not be unified in tacton

Fixed in module feature aggregations: no-unifying properties don't generate aggregations now


## [CLOSED] Fix qty in Palma is not enforced

Prune control enforces position quantity 0..X
In Palma it can be just X (optionality comes from upper level)

Add constraint to lock qty on X when prune is NO

Fixed, additional constraints are generated, qty works ok