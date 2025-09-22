#!/usr/bin/env python3
"""
Script to add sample stats data to existing templates for testing the hover stats feature.
This will update templates with sample n_countries, brand, and reach values.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the supabase client from the TypeScript file
# For now, this script assumes you have the environment variables set up
# You may need to create a separate Python supabase client or use environment variables directly
import os
from supabase import create_client

supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
    sys.exit(1)

supabase = create_client(supabase_url, supabase_key)

def add_sample_stats():
    try:
        # Sample stats data - you can customize these values
        sample_stats = [
            {"n_countries": 15, "brand": "Nike", "reach": 1250000},
            {"n_countries": 8, "brand": "Coca-Cola", "reach": 890000},
            {"n_countries": 22, "brand": "Apple", "reach": 2100000},
            {"n_countries": 12, "brand": "Samsung", "reach": 980000},
            {"n_countries": 18, "brand": "Adidas", "reach": 1450000},
            {"n_countries": 9, "brand": "Pepsi", "reach": 750000},
            {"n_countries": 25, "brand": "Google", "reach": 3200000},
            {"n_countries": 14, "brand": "Microsoft", "reach": 1800000},
            {"n_countries": 11, "brand": "Amazon", "reach": 1650000},
            {"n_countries": 7, "brand": "Starbucks", "reach": 620000},
        ]

        # Get all templates
        response = supabase.table('templates').select('id').execute()
        templates = response.data

        if not templates:
            print("No templates found in the database.")
            return

        print(f"Found {len(templates)} templates. Adding sample stats...")

        # Update each template with sample stats
        for i, template in enumerate(templates):
            stats = sample_stats[i % len(sample_stats)]  # Cycle through sample stats

            update_response = supabase.table('templates').update({
                'n_countries': stats['n_countries'],
                'brand': stats['brand'],
                'reach': stats['reach']
            }).eq('id', template['id']).execute()

            if update_response.data:
                print(f"Updated template {template['id']}: {stats['n_countries']} countries, {stats['brand']}, {stats['reach']} reach")
            else:
                print(f"Failed to update template {template['id']}")

        print("Sample stats added successfully!")

    except Exception as e:
        print(f"Error adding sample stats: {e}")
        print("Make sure your Supabase connection is properly configured.")

if __name__ == "__main__":
    add_sample_stats()
