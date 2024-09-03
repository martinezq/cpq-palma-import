# Backlog

## #001 [CLOSED] Problem with palma_squeegee_blade_module

In module palma_squeegee_blade_module, variants with 40" scrubbing width don't work in MLI assembly

Domain elements with "?" (Small?) - what is this?

Problem with unifier logic - some should not be unified in tacton

Fixed in module feature aggregations: no-unifying properties don't generate aggregations now


## #002 [CLOSED] Fix qty in Palma is not enforced

Prune control enforces position quantity 0..X
In Palma it can be just X (optionality comes from upper level)

Add constraint to lock qty on X when prune is NO

Fixed, additional constraints are generated, qty works ok

## #003 [NEW] Unifier on qty of module positions (missing in Tacton)

When property is an unifier and is unifying qty's of positions realized by modules, it can't be converted into aggregation (this kind of aggregation is not supported in Tacton)

Options:
- more attributes (for each module position, one qty attribute in the assembly), constraints linking with qty's, aggregation on attributes
- more constraints covering for missing aggregation

## ??? 

Side sweep-left should be locked to position "left". I don't know how it's in palma yet

Possibly will be solved with unifier on modules

### #004 [NEW] Qty controlled by boolean property

In this scenario the palma node is flagged as variable=false but has qty property which is of boolean type. Constraint should be generated in this case.

Yes=1
No=1


### #005 [NEW] Qty cases if variable is true

For some reason, the constraint to control the cases is not generated when variable is true. Possibly the case logic should work regardless of variable flag

### #006 [NEW] Variable Qty should be enforced when prune is No

Currently qty is allowed to be 0 or controlled by qty attribute. Should be more like this: _prune_attribute in {Yes} or n195_side_broom_position.qty=side_broom_qty_attribute.number