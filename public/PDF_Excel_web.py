import pandas as pd

# Load your multi-sheet Excel file
input_file = "شمال.xlsx"
output_file = "شمال_دمج_الصفحات.xlsx"

xls = pd.ExcelFile(input_file)
all_sheets = []

for sheet_name in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet_name)
    df["اسم الورقة / Sheet"] = sheet_name
    all_sheets.append(df)

# Combine all sheets into one
combined_df = pd.concat(all_sheets, ignore_index=True)
combined_df = combined_df.dropna(how="all", axis=1)

for col in combined_df.columns:
    if combined_df[col].dtype == "object":
        combined_df[col] = combined_df[col].astype(str).str.replace("\n", "").str.strip()

# Save the final single-sheet file
combined_df.to_excel(output_file, index=False, engine="openpyxl")
print(f"Done! Combined file saved as: {output_file}")