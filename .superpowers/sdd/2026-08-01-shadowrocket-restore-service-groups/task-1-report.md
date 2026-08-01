# Task 1 report: restore direct-first group choices

## RED

The required command was first attempted in the workspace:

```text
node --test test/groups.test.js
zsh:1: command not found: node
```

The environment has no system `node` executable. To verify the intended
regression without changing the workspace, Node v22.14.0 was downloaded to a
temporary directory and the same updated test was applied to a temporary
`git archive HEAD` copy. The focused command then failed as intended:

```text
not ok 3 - keeps service manual access and gates special service groups by eligibility
🍎 Apple
+ actual - expected
  [
    'DIRECT',
    '🚀 节点选择',
-   '⚡ 全部自动',
-   '🛟 全部故障转移',
-   '🌏 亚太',
-   '🌍 欧洲',
-   '🌎 美洲'
  ]
```

## GREEN

Focused command (using temporary Node v22.14.0):

```text
/tmp/shadowrocket-node.Qf7RvH/bin/node --test test/groups.test.js
# tests 13
# pass 13
# fail 0
```

Full command (using the same temporary Node binary because system `node` is
absent):

```text
/tmp/shadowrocket-node.Qf7RvH/bin/node --test
# tests 89
# pass 89
# fail 0
```

## Changed files

- `test/groups.test.js`: makes each direct-first service group's full,
  literal candidate order a regression contract.
- `src/group-catalog.js`: replaces the identity-based service-group branch
  with `serviceChoiceItems(defaults, presentContinentNames)`. Proxy-first
  defaults place `DIRECT` after candidates; direct-first defaults keep
  `DIRECT` first and the proxy selector second.

## Self-review

- The direct-first expectation is literal and exercises `buildGroups` output.
- Existing proxy-first literal assertions and the exact `['PROXY']` root
  assertion remain intact.
- Service groups still pass through `subscriptionGroup`, so
  `include-all-proxies=true` behavior is preserved.
- The focused graph test passes, covering duplicate and cyclic references.
- `git diff --check` passed; only Task 1 code/test files and this required
  report are changed.

## Commit

`fix: restore direct-first group choices`
