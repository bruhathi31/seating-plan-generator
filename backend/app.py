from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
import uuid

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+asyncpg://user:password@localhost/seating_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Person(db.Model):
    __tablename__ = 'people'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String, nullable=False)
    group_id = db.Column(UUID(as_uuid=True), db.ForeignKey('groups.id'), nullable=True)

class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String, nullable=False)

class Table(db.Model):
    __tablename__ = 'tables'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capacity = db.Column(db.Integer, nullable=False)

class SeatingPlan(db.Model):
    __tablename__ = 'seating_plan'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class SeatingAssignment(db.Model):
    __tablename__ = 'seating_assignments'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seating_plan_id = db.Column(UUID(as_uuid=True), db.ForeignKey('seating_plan.id'), nullable=False)
    person_id = db.Column(UUID(as_uuid=True), db.ForeignKey('people.id'), nullable=False)
    table_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tables.id'), nullable=False)

# Routes
@app.route('/add_person', methods=['POST'])
def add_person():
    data = request.json
    person = Person(name=data['name'], group_id=data.get('group_id'))
    db.session.add(person)
    db.session.commit()
    return jsonify({'message': 'Person added', 'person_id': str(person.id)})

@app.route('/add_group', methods=['POST'])
def add_group():
    data = request.json
    group = Group(name=data['name'])
    db.session.add(group)
    db.session.commit()
    return jsonify({'message': 'Group added', 'group_id': str(group.id)})

@app.route('/generate_seating', methods=['POST'])
def generate_seating():
    tables = Table.query.all()
    people = Person.query.all()
    
    seating_plan = SeatingPlan()
    db.session.add(seating_plan)
    db.session.flush()
    
    assignments = []
    table_index = 0
    for person in people:
        table = tables[table_index]
        assignment = SeatingAssignment(seating_plan_id=seating_plan.id, person_id=person.id, table_id=table.id)
        assignments.append(assignment)
        
        # Move to next table when capacity is reached
        if len([a for a in assignments if a.table_id == table.id]) >= table.capacity:
            table_index = (table_index + 1) % len(tables)
    
    db.session.bulk_save_objects(assignments)
    db.session.commit()
    return jsonify({'message': 'Seating plan generated', 'seating_plan_id': str(seating_plan.id)})

@app.route('/get_seating_plan/<plan_id>', methods=['GET'])
def get_seating_plan(plan_id):
    assignments = SeatingAssignment.query.filter_by(seating_plan_id=plan_id).all()
    result = [{'person_id': str(a.person_id), 'table_id': str(a.table_id)} for a in assignments]
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
