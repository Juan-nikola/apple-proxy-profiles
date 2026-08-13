import { CONTINENT } from "../contracts.js";

// ISO 3166-1 alpha-2 country and territory codes, grouped for this Profile's
// deliberately compact four-continent UI. The grouping follows Unicode CLDR
// geographic containment, with Asia and Oceania combined as "Asia-Pacific".
const REGION_CODES = Object.freeze({
  [CONTINENT.asiaPacific]: Object.freeze(`
    AE AF AM AS AU AZ BD BH BN BT CC CK CN CX CY FJ FM GE GU HK HM ID IL IN
    IQ IR JO JP KG KH KI KP KR KW KZ LA LB LK MH MM MN MO MP MV MY NC NF NP NR
    NU NZ OM PF PG PH PK PN PS PW QA SA SB SG SY TH TJ TK TL TM TO TR TV TW
    UM UZ VN VU WF WS YE
  `.trim().split(/\s+/)),
  [CONTINENT.europe]: Object.freeze(`
    AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE
    IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK
    SM UA VA
  `.trim().split(/\s+/)),
  [CONTINENT.americas]: Object.freeze(`
    AG AI AR AW BB BL BM BO BQ BR BS BV BZ CA CL CO CR CU CW DM DO EC FK GD GF
    GL GP GS GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX
    TC TT US UY VC VE VG VI
  `.trim().split(/\s+/)),
  [CONTINENT.other]: Object.freeze(`
    AO AQ BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ
    GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN
    SO SS ST SZ TD TF TG TN TZ UG YT ZA ZM ZW
  `.trim().split(/\s+/)),
});

function countryCodeToFlag(code) {
  return [...code].map((letter) => String.fromCodePoint(0x1F1E6 + letter.charCodeAt(0) - 65)).join("");
}

const COUNTRY_FLAG_PATTERN = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;

export const COUNTRY_CODE_COUNT = Object.values(REGION_CODES).flat().length;

export const CONTINENT_FLAGS = Object.freeze(Object.fromEntries(
  Object.entries(REGION_CODES).map(([continent, codes]) => [
    continent,
    Object.freeze(codes.map(countryCodeToFlag)),
  ]),
));

const FLAG_CONTINENTS = new Map(
  Object.entries(CONTINENT_FLAGS).flatMap(([continent, flags]) => (
    flags.map((flag) => [flag, continent])
  )),
);

export function continentForFlag(flag) {
  return FLAG_CONTINENTS.get(flag) ?? null;
}

export function isCountryFlag(flag) {
  return typeof flag === "string" && COUNTRY_FLAG_PATTERN.test(flag);
}
