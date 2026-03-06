import sqlite3

conn = sqlite3.connect(r'c:\Users\joe_freightos\Desktop\JAXO COMMAND CENTER\instance\family_command_center.db')
cursor = conn.cursor()

# List tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table";')
tables = cursor.fetchall()
print("Tablas en la base de datos:")
for table in tables:
    print(f"- {table[0]}")

# Check if there's data
for table in tables:
    table_name = table[0]
    cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
    count = cursor.fetchone()[0]
    print(f"  {table_name}: {count} registros")

conn.close()
