import csv
import json
import sys
from pathlib import Path

FIELDS = [
    "sale_tran_nbr",
    "swis_cd",
    "print_key",
    "control_nbr",
    "document_nbr",
    "sale_price",
    "sale_dte",
    "deed_dte",
    "contract_dt",
    "arms_length_flag",
    "cod_usable",
    "rar_usable",
    "total_av",
    "personal_prop",
    "front",
    "depth",
    "total_sale_acres",
    "nbr_of_parcels",
    "prop_class_last_roll",
    "prop_class_at_sale",
    "prop_class_cd_desc_roll",
    "prop_class_cd_desc_sale",
    "new_const_flag",
    "seller_last_nam",
    "seller_first_name",
    "buyer_last_name",
    "buyer_first_nam",
    "buyer_st_nbr",
    "buyer_st_nam",
    "buyer_city",
    "buyer_state",
    "st_nbr",
    "st_nam",
    "zip5",
    "buyer_zip5",
    "roll_yr",
    "cond_business_sale",
    "cond_buyer_is_seller",
    "cond_company_sale",
    "cond_deed_type",
    "cond_estate_sale",
    "cond_forced_sale",
    "cond_govt_sale",
    "cond_interest_conv",
    "cond_misc",
    "cond_multiple_swis",
    "cond_none",
    "cond_old_contract",
    "cond_other",
    "cond_relative_sale",
    "cond_signif_change",
    "cond_signif_pers",
    "cond_uniformed_party",
    "cond_memo",
]

NUMERIC_FIELDS = {
    "sale_price",
    "total_av",
    "personal_prop",
    "front",
    "depth",
    "total_sale_acres",
    "nbr_of_parcels",
    "roll_yr",
}


def clean(value: str) -> str:
    return (value or "").strip()


def as_number(value: str):
    text = clean(value)
    if not text:
        return None
    try:
        number = float(text.replace(",", ""))
    except ValueError:
        return None
    if number.is_integer():
        return int(number)
    return number


def build_address(row):
    parts = [clean(row.get("st_nbr", "")), clean(row.get("st_nam", ""))]
    return " ".join([p for p in parts if p]) or None


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: convert-sales-csv.py <input.csv> <output.json>")
    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    rows = []
    with source.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        for raw_row in reader:
            row = {}
            for field in FIELDS:
                value = raw_row.get(field, "")
                row[field] = as_number(value) if field in NUMERIC_FIELDS else clean(value)
            row["address"] = build_address(raw_row)
            rows.append(row)
    target.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} sales records to {target}")


if __name__ == "__main__":
    main()