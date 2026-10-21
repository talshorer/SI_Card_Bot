---
title: "/spirit"
layout: default
---

[← Back to command list](../index.html)

# /spirit

Spirit Search

## Usage

```
/spirit <spirit> [side]
```

## Options

| Option   | Type   | Required | Description                                                                    |
| -------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `spirit` | string | yes      | Spirit name or alias.                                                          |
| `side`   | string | no       | Which side of the panel (defaults to front). One of: `front`, `back`, `extra`. |

Looks up a spirit by name or alias and returns its panel image (front by default, or the back via the `side` option). Spirits with extra boards (e.g. Covets Gleaming Shards of Earth's Gleaming Hoard) send those with `side: Extra panel`. Use `/spirits` to list every spirit.
