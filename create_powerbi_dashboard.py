import os
import uuid
import shutil
import json
import powerbpy

def build_dashboard():
    # Paths
    dashboard_name = "CustomerSegmentationDashboard"
    if os.path.exists(dashboard_name):
        # Clean up existing folder if it exists
        shutil.rmtree(dashboard_name, ignore_errors=True)
        
    print("Creating Power BI Project...")
    db = powerbpy.Dashboard.create(dashboard_name)
    
    # Add segmented dataset
    csv_file = "Mall_Customers_Segmented.csv"
    print(f"Adding local CSV source: {csv_file}...")
    dataset = db.add_local_csv(csv_file)
    dataset_name = dataset.dataset_name  # Mall_Customers_Segmented
    
    # Inject DAX measures into the table's TMDL file
    # We open the generated TMDL file and insert measures right after the lineageTag line.
    tmdl_file_path = dataset.dataset_file_path
    print(f"Injecting DAX measures into {tmdl_file_path}...")
    
    with open(tmdl_file_path, 'r', encoding='utf-8') as f:
        tmdl_lines = f.readlines()
        
    # We find where to insert the measures (usually after lineageTag: <uuid>)
    insert_idx = -1
    for idx, line in enumerate(tmdl_lines):
        if "lineageTag:" in line:
            insert_idx = idx + 1
            break
            
    if insert_idx != -1:
        measures_tmdl = [
            f"\n\tmeasure 'Total Customers' = COUNT('{dataset_name}'[CustomerID])\n",
            f"\t\tformatString: #,0\n",
            f"\t\tlineageTag: {uuid.uuid4()}\n",
            f"\n\tmeasure 'Average Age' = AVERAGE('{dataset_name}'[Age])\n",
            f"\t\tformatString: 0.0\n",
            f"\t\tlineageTag: {uuid.uuid4()}\n",
            f"\n\tmeasure 'Average Annual Income' = AVERAGE('{dataset_name}'[Annual Income (k$)])\n",
            f"\t\tformatString: \"$\"#,##0.00\n",
            f"\t\tlineageTag: {uuid.uuid4()}\n",
            f"\n\tmeasure 'Average Spending Score' = AVERAGE('{dataset_name}'[Spending Score (1-100)])\n",
            f"\t\tformatString: 0.0\n",
            f"\t\tlineageTag: {uuid.uuid4()}\n\n"
        ]
        tmdl_lines = tmdl_lines[:insert_idx] + measures_tmdl + tmdl_lines[insert_idx:]
        
        with open(tmdl_file_path, 'w', encoding='utf-8') as f:
            f.writelines(tmdl_lines)
            
    print("Creating Overview Page...")
    # We create the page with title=None and subtitle=None so we can customize positioning
    page = db.new_page("Overview", title=None, subtitle=None)
    
    # 1. Header Title
    print("Adding Title and Header Visuals...")
    page.add_text_box(
        text="<font size='24'><b>Mall Customer Segmentation Dashboard</b></font><br/><font size='10' color='#666666'>Interactive customer demographics and spending behavior insights</font>",
        visual_id="title_header",
        x_position=40,
        y_position=20,
        width=1200,
        height=70,
        font_size=18,
        font_weight="normal"
    )
    
    # 2. KPI Cards
    print("Adding KPI Cards...")
    # Card 1: Total Customers
    page.add_card(
        data_source=dataset_name,
        measure_name="Total Customers",
        visual_id="kpi_total_customers",
        x_position=40,
        y_position=100,
        width=270,
        height=100,
        card_title="Total Customers"
    )
    # Card 2: Average Age
    page.add_card(
        data_source=dataset_name,
        measure_name="Average Age",
        visual_id="kpi_avg_age",
        x_position=350,
        y_position=100,
        width=270,
        height=100,
        card_title="Average Age"
    )
    # Card 3: Average Income
    page.add_card(
        data_source=dataset_name,
        measure_name="Average Annual Income",
        visual_id="kpi_avg_income",
        x_position=660,
        y_position=100,
        width=270,
        height=100,
        card_title="Avg Annual Income"
    )
    # Card 4: Average Spending Score
    page.add_card(
        data_source=dataset_name,
        measure_name="Average Spending Score",
        visual_id="kpi_avg_spending",
        x_position=970,
        y_position=100,
        width=270,
        height=100,
        card_title="Avg Spending Score"
    )
    
    # 3. Filters / Slicers
    print("Adding Slicers...")
    # Slicer 1: Gender
    page.add_slicer(
        data_source=dataset_name,
        column_name="Gender",
        visual_id="filter_gender",
        x_position=40,
        y_position=220,
        width=270,
        height=120,
        title="Filter by Gender"
    )
    # Slicer 2: Segment
    page.add_slicer(
        data_source=dataset_name,
        column_name="Segment",
        visual_id="filter_segment",
        x_position=40,
        y_position=360,
        width=270,
        height=320,
        title="Filter by Customer Segment"
    )
    
    # 4. Charts
    print("Adding Charts...")
    # Chart 1: Customers by Segment
    page.add_chart(
        visual_id="chart_customers_by_segment",
        chart_type="columnChart",
        data_source=dataset_name,
        chart_title="Customers by Segment",
        x_axis_title="Segment",
        y_axis_title="Count of Customers",
        x_axis_var="Segment",
        y_axis_var="CustomerID",
        y_axis_var_aggregation_type="Count",
        x_position=350,
        y_position=220,
        width=440,
        height=220
    )
    # Chart 2: Average Spending Score by Segment
    page.add_chart(
        visual_id="chart_avg_spending_by_segment",
        chart_type="barChart",
        data_source=dataset_name,
        chart_title="Avg Spending Score by Segment",
        x_axis_title="Segment",
        y_axis_title="Average Spending Score",
        x_axis_var="Segment",
        y_axis_var="Spending Score (1-100)",
        y_axis_var_aggregation_type="Average",
        x_position=800,
        y_position=220,
        width=440,
        height=220
    )
    
    # 5. Data Table
    print("Adding Customer Details Table...")
    page.add_table(
        visual_id="table_customer_details",
        data_source=dataset_name,
        variables=["CustomerID", "Gender", "Age", "Annual Income (k$)", "Spending Score (1-100)", "Segment"],
        x_position=350,
        y_position=460,
        width=890,
        height=220,
        table_title="Customer Details List"
    )
    
    print("Saving Power BI Project structure...")
    # Save the project (under the hood powerbpy saves parts reactive, but make sure it is written)
    # We don't need a separate save for powerbpy because it edits JSONs in-place.
    print(f"Power BI Project (.pbip) has been created successfully at {os.path.abspath(dashboard_name)}")

if __name__ == '__main__':
    build_dashboard()
