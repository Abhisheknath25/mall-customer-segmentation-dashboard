import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import json
import os

def segment_customers():
    # Load dataset
    data_path = 'Mall_Customers.csv'
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Could not find {data_path}")
        
    df = pd.read_csv(data_path)
    
    # Features for clustering: Annual Income (k$) and Spending Score (1-100)
    X = df[['Annual Income (k$)', 'Spending Score (1-100)']].values
    
    # We use 5 clusters as it is the standard and mathematically optimal number for this dataset
    kmeans = KMeans(n_clusters=5, init='k-means++', random_state=42, n_init=10)
    df['Cluster_ID'] = kmeans.fit_predict(X)
    
    # Assign semantic names to clusters based on their centroids
    centers = kmeans.cluster_centers_
    
    # Let's map each cluster ID to its description based on its center
    cluster_mapping = {}
    for i, center in enumerate(centers):
        income, spending = center[0], center[1]
        if income < 40 and spending < 40:
            name = "Low Income, Low Spending"
            desc = "Frugal/Sensible Shoppers"
        elif income < 40 and spending > 60:
            name = "Low Income, High Spending"
            desc = "Spendthrifts/Impulsive Shoppers"
        elif income > 70 and spending < 40:
            name = "High Income, Low Spending"
            desc = "Careful/Conservative Shoppers"
        elif income > 70 and spending > 60:
            name = "High Income, High Spending"
            desc = "Premium Target Customers"
        else:
            name = "Average Income, Average Spending"
            desc = "Standard/Moderate Shoppers"
        cluster_mapping[i] = (name, desc)
        
    df['Segment'] = df['Cluster_ID'].map(lambda x: cluster_mapping[x][0])
    df['Segment_Description'] = df['Cluster_ID'].map(lambda x: cluster_mapping[x][1])
    
    # Save the updated dataset as CSV
    output_csv = 'Mall_Customers_Segmented.csv'
    df.to_csv(output_csv, index=False)
    print(f"Segmented dataset saved to {output_csv}")
    
    # Save to JSON for the Web Dashboard
    output_json = 'customers_segmented.json'
    records = df.to_dict(orient='records')
    
    # Export cluster details for dashboard statistics
    cluster_stats = []
    for i, center in enumerate(centers):
        name, desc = cluster_mapping[i]
        c_df = df[df['Cluster_ID'] == i]
        cluster_stats.append({
            'cluster_id': int(i),
            'name': name,
            'description': desc,
            'center_income': float(center[0]),
            'center_spending': float(center[1]),
            'count': int(len(c_df)),
            'avg_age': float(c_df['Age'].mean())
        })
        
    dashboard_data = {
        'customers': records,
        'segments': cluster_stats,
        'summary': {
            'total_customers': int(len(df)),
            'avg_age': float(df['Age'].mean()),
            'avg_income': float(df['Annual Income (k$)'].mean()),
            'avg_spending': float(df['Spending Score (1-100)'].mean()),
            'gender_distribution': df['Gender'].value_counts().to_dict()
        }
    }
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, indent=4)
    print(f"Segmented data and metadata saved to {output_json}")

if __name__ == '__main__':
    segment_customers()
