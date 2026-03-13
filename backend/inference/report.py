from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Image,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()
cell_style = styles["BodyText"]


def generate_pdf(data, output_path):

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(output_path, pagesize=A4)

    content = []

    job_id = data.get("job_id", "Unknown")
    total_scans = data.get("total_scans", 0)
    inspection_date = data.get("inspection_date", "")
    scans = data.get("scans", [])

    defect_summary = data.get("defect_summary", {})

    # -----------------------------
    # TITLE
    # -----------------------------
    content.append(Paragraph("Welding Inspection Report", styles["Title"]))
    content.append(Spacer(1, 12))

    # -----------------------------
    # JOB METADATA
    # -----------------------------
    metadata_table = Table(
        [
            ["Job ID", job_id],
            ["Inspection Date", inspection_date],
            ["Total Weld Scans", str(total_scans)],
        ],
        colWidths=[6 * cm, 10 * cm],
    )

    metadata_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ]
        )
    )

    content.append(metadata_table)
    content.append(Spacer(1, 20))

    # -----------------------------
    # IMAGE
    # -----------------------------
    # -----------------------------
# SCAN IMAGES
# -----------------------------
    scans = data.get("scans", [])

    for scan in scans:

        content.append(Paragraph(f"Scan ID: {scan['scan_id']}", styles["Heading2"]))
        content.append(Spacer(1, 10))

        image_path = scan.get("image_path")

        if image_path:
            try:
                img = Image(image_path)
                img.drawHeight = 6 * cm
                img.drawWidth = 12 * cm
                content.append(img)
                content.append(Spacer(1, 20))
            except:
                content.append(Paragraph("Image not found", cell_style))

    # -----------------------------
    # DEFECT SUMMARY TABLE
    # -----------------------------
    content.append(Paragraph("Defect Summary", styles["Heading2"]))

    summary_data = [["Defect Type", "Occurrences"]]

    for defect, info in defect_summary.items():
        summary_data.append(
            [Paragraph(defect, cell_style), Paragraph(str(info["count"]), cell_style)]
        )
        summary_table = Table(summary_data, colWidths=[8 * cm, 4 * cm])

        summary_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ]
            )
        )

    content.append(summary_table)
    content.append(Spacer(1, 20))

    # -----------------------------
    # DETAILED DEFECT TABLE
    # -----------------------------
    content.append(Paragraph("Detailed Defect Analysis", styles["Heading2"]))

    detailed_data = [["Defect", "Meaning", "Cause", "Acceptability", "Recommendation"]]

    for defect, info in defect_summary.items():

        detailed_data.append(
            [
                Paragraph(defect, cell_style),
                Paragraph(info["meaning"], cell_style),
                Paragraph(info["cause"], cell_style),
                Paragraph(info["acceptability"], cell_style),
                Paragraph(info["recommendation"], cell_style),
            ]
        )

    detailed_table = Table(
        detailed_data, colWidths=[3 * cm, 4 * cm, 4 * cm, 3 * cm, 4 * cm]
    )

    detailed_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ]
        )
    )

    content.append(detailed_table)
    content.append(Spacer(1, 20))

    # -----------------------------
    # OVERALL STATUS
    # -----------------------------
    status = "PASS"

    for defect in defect_summary:
        if defect not in ["Good Welding", "Spatters"]:
            status = "FAIL"

    content.append(
        Paragraph(f"<b>Overall Weld Status:</b> {status}", styles["Heading2"])
    )

    doc.build(content)
