// Small, inline domestic safety net for endpoints that commonly appear in
// downloads and media flows. The large DomesticCore rule set remains the
// authoritative broad catalog; these entries avoid a one-day remote-rule
// cache window turning a newly published domestic endpoint into proxy traffic.
export const CRITICAL_DOMESTIC_DOMAIN_SUFFIXES = Object.freeze([
  "baidupcs.com",
  "baidupcs.net",
  "baiduyun.com",
  "baiduyuncdn.com",
  "baidubce.com",
  "bcebos.com",
  "bdstatic.com",
]);

export const CRITICAL_DOMESTIC_RULES = Object.freeze(
  CRITICAL_DOMESTIC_DOMAIN_SUFFIXES.map((suffix) => `DOMAIN-SUFFIX,${suffix}`),
);
