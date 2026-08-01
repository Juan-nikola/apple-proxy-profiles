function escapeValue(value) {
  const string = String(value);
  if (/[\r\n]/.test(string)) throw new Error("Group field values must not contain CR or LF");
  return string.replaceAll(",", "\\,");
}

export function renderGroups(groups, subscriptionName) {
  return groups.map((group) => {
    const items = (group.items ?? []).map(escapeValue);
    const fields = [escapeValue(group.type), ...items];
    if (group.useSubscription) {
      fields.push(escapeValue(subscriptionName), "use=true");
    }
    if (group.filter !== undefined) fields.push(`policy-regex-filter=${escapeValue(group.filter)}`);
    if (group.url !== undefined) fields.push(`url=${escapeValue(group.url)}`);
    if (group.interval !== undefined) fields.push(`interval=${escapeValue(group.interval)}`);
    if (group.timeout !== undefined) fields.push(`timeout=${escapeValue(group.timeout)}`);
    if (group.tolerance !== undefined) fields.push(`tolerance=${escapeValue(group.tolerance)}`);
    if (group.hidden) fields.push("hidden=1");
    return `${escapeValue(group.name)} = ${fields.join(",")}`;
  });
}

