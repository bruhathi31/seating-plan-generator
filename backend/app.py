from flask import Flask, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

class SeatingPlanner:
    def __init__(self, guests, groups, tables_config):
        """
        Initialize the seating planner.
        
        Args:
            guests (list): List of guest names
            groups (list): List of groups, where each group is a list of guests
            tables_config (list): List of table capacities
        """
        self.guests = guests
        self.groups = groups
        self.tables_config = tables_config
        
    def validate_input(self):
        """Validate that the input configuration is feasible."""
        # Check if we have enough seats
        total_capacity = sum(self.tables_config)
        if len(self.guests) > total_capacity:
            return False, f"Not enough seats. Need {len(self.guests)} seats but only have {total_capacity}."
        
        # Check if any group is larger than the largest table
        max_table_size = max(self.tables_config)
        for group in self.groups:
            if len(group) > max_table_size:
                return False, f"Group {group} has {len(group)} people but largest table fits {max_table_size}."
        
        return True, "Configuration is valid."
    
    def generate_plan(self):
        """Generate a seating plan based on the constraints."""
        # First validate the input
        valid, message = self.validate_input()
        if not valid:
            return {"error": message}
        
        # Initialize tables
        tables = [[] for _ in self.tables_config]
        
        # First, try to place groups together
        for group in sorted(self.groups, key=len, reverse=True):
            placed = False
            
            # Try to place the group at a table with enough space
            for i, table in enumerate(tables):
                if len(table) + len(group) <= self.tables_config[i]:
                    tables[i].extend(group)
                    placed = True
                    break
            
            # If we couldn't place the group together, we'll need to split them
            if not placed:
                # For simplicity, we'll just add them individually
                for person in group:
                    if person not in [p for t in tables for p in t]:  # Avoid duplicates
                        placed_person = False
                        for i, table in enumerate(tables):
                            if len(table) < self.tables_config[i]:
                                tables[i].append(person)
                                placed_person = True
                                break
                        if not placed_person:
                            return {"error": f"Could not place {person}. Algorithm needs improvement."}
        
        # Place remaining guests
        unassigned = [g for g in self.guests if g not in [p for t in tables for p in t]]
        for person in unassigned:
            placed = False
            for i, table in enumerate(tables):
                if len(table) < self.tables_config[i]:
                    tables[i].append(person)
                    placed = True
                    break
            if not placed:
                return {"error": f"Could not place {person}. Algorithm needs improvement."}
        
        # Format the result
        result = []
        for i, table in enumerate(tables):
            result.append({
                "table_number": i + 1,
                "capacity": self.tables_config[i],
                "guests": table,
                "empty_seats": self.tables_config[i] - len(table)
            })
        
        return {"seating_plan": result}

@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        guests = data.get('guests', [])
        groups = data.get('groups', [])
        tables_config = data.get('tables_config', [])
        
        # Validate inputs
        if not guests:
            return jsonify({"error": "No guests provided"}), 400
        if not tables_config:
            return jsonify({"error": "No table configuration provided"}), 400
        
        # Create planner and generate plan
        planner = SeatingPlanner(guests, groups, tables_config)
        result = planner.generate_plan()
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)