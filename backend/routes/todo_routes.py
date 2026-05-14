"""
Rutas CRUD para To-Do List
"""
from flask import Blueprint, request, jsonify
from extensions import db
from models.todo import Todo

todo_bp = Blueprint('todo', __name__)


@todo_bp.route('', methods=['GET'])
def get_todos():
    todos = Todo.query.order_by(Todo.created_at.desc()).all()
    return jsonify({'success': True, 'data': [t.to_dict() for t in todos]})


@todo_bp.route('', methods=['POST'])
def create_todo():
    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({'success': False, 'message': 'title requerido'}), 400
    todo = Todo(
        title=data['title'],
        category=data.get('category', 'personal'),
        priority=data.get('priority', 'media'),
        due_date=data.get('dueDate'),
        notes=data.get('notes'),
    )
    db.session.add(todo)
    db.session.commit()
    return jsonify({'success': True, 'data': todo.to_dict()}), 201


@todo_bp.route('/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    data = request.get_json() or {}
    for field in ['title', 'category', 'priority', 'notes']:
        if field in data:
            setattr(todo, field, data[field])
    if 'dueDate' in data:
        todo.due_date = data['dueDate']
    if 'completed' in data:
        todo.completed = bool(data['completed'])
    db.session.commit()
    return jsonify({'success': True, 'data': todo.to_dict()})


@todo_bp.route('/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    db.session.delete(todo)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Tarea eliminada'})
