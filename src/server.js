const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbDir, 'classroom.db'), (err) => {
  if (err) {
    console.error('Database error:', err.message);
    return;
  }
  console.log('Connected to the classroom database.');
});

// Schema Migration
db.serialize(() => {
  // Create tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    uni_id TEXT,
    points REAL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    members TEXT,
    score REAL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    type TEXT,
    options TEXT,
    answer TEXT
  )`);

  // Check and add missing columns
  // Students: points
  db.all("PRAGMA table_info(students)", (err, columns) => {
    if (err) {
      console.error('PRAGMA table_info students error:', err.message);
      return;
    }
    const hasPoints = columns.some(col => col.name === 'points');
    if (!hasPoints) {
      console.log('Adding points column to students table...');
      db.run('ALTER TABLE students ADD COLUMN points REAL DEFAULT 0', (err) => {
        if (err) {
          console.error('ALTER TABLE students ADD points error:', err.message);
        } else {
          console.log('points column added to students table successfully.');
        }
      });
    } else {
      console.log('points column already exists in students table.');
    }
  });

  // Students: uni_id (existing check)
  db.all("PRAGMA table_info(students)", (err, columns) => {
    if (err) {
      console.error('PRAGMA table_info students error:', err.message);
      return;
    }
    const hasUniId = columns.some(col => col.name === 'uni_id');
    if (!hasUniId) {
      console.log('Adding uni_id column to students table...');
      db.run('ALTER TABLE students ADD COLUMN uni_id TEXT', (err) => {
        if (err) {
          console.error('ALTER TABLE students ADD uni_id error:', err.message);
        } else {
          console.log('uni_id column added to students table successfully.');
        }
      });
    } else {
      console.log('uni_id column already exists in students table.');
    }
  });

  // Teams: score
  db.all("PRAGMA table_info(teams)", (err, columns) => {
    if (err) {
      console.error('PRAGMA table_info teams error:', err.message);
      return;
    }
    const hasScore = columns.some(col => col.name === 'score');
    if (!hasScore) {
      console.log('Adding score column to teams table...');
      db.run('ALTER TABLE teams ADD COLUMN score REAL DEFAULT 0', (err) => {
        if (err) {
          console.error('ALTER TABLE teams ADD score error:', err.message);
        } else {
          console.log('score column added to teams table successfully.');
        }
      });
    } else {
      console.log('score column already exists in teams table.');
    }
  });
});

// Students
app.get('/students', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) {
      console.error('GET /students error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/students', (req, res) => {
  const { name, uni_id } = req.body;
  if (!name || !uni_id) {
    console.error('POST /students error: Missing name or uni_id');
    return res.status(400).json({ error: 'Name and university ID are required' });
  }
  db.run('INSERT INTO students (name, uni_id, points) VALUES (?, ?, 0)', [name, uni_id], function(err) {
    if (err) {
      console.error('POST /students error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Student added:', { id: this.lastID, name, uni_id });
    res.json({ id: this.lastID, name, uni_id, points: 0 });
  });
});

app.put('/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, uni_id } = req.body;
  if (!name || !uni_id) {
    console.error('PUT /students error: Missing name or uni_id');
    return res.status(400).json({ error: 'Name and university ID are required' });
  }
  db.run('UPDATE students SET name = ?, uni_id = ? WHERE id = ?', [name, uni_id, id], function(err) {
    if (err) {
      console.error('PUT /students error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Student updated:', { id, name, uni_id });
    res.json({ changes: this.changes });
  });
});

app.delete('/students/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('DELETE /students error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.post('/students/:id/points', (req, res) => {
  const { id } = req.params;
  const { points } = req.body;
  db.run('UPDATE students SET points = points + ? WHERE id = ?', [points, id], function(err) {
    if (err) {
      console.error('POST /students/points error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

// Teams
app.get('/teams', (req, res) => {
  db.all('SELECT * FROM teams', [], (err, rows) => {
    if (err) {
      console.error('GET /teams error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/teams', (req, res) => {
  const { name, members } = req.body;
  if (!name || !members) {
    console.error('POST /teams error: Missing name or members');
    return res.status(400).json({ error: 'Name and members are required' });
  }
  db.run('INSERT INTO teams (name, members, score) VALUES (?, ?, 0)', [name, JSON.stringify(members)], function(err) {
    if (err) {
      console.error('POST /teams error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Team added:', { id: this.lastID, name, members });
    res.json({ id: this.lastID, name, members, score: 0 });
  });
});

app.put('/teams/:id', (req, res) => {
  const { id } = req.params;
  const { name, members } = req.body;
  db.run('UPDATE teams SET name = ?, members = ? WHERE id = ?', [name, JSON.stringify(members), id], function(err) {
    if (err) {
      console.error('PUT /teams error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.delete('/teams/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM teams WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('DELETE /teams error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.post('/teams/:id/points', (req, res) => {
  const { id } = req.params;
  const { points } = req.body;
  db.run('UPDATE teams SET score = score + ? WHERE id = ?', [points, id], function(err) {
    if (err) {
      console.error('POST /teams/points error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.put('/teams/:id/score', (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  db.run('UPDATE teams SET score = score + ? WHERE id = ?', [score, id], function(err) {
    if (err) {
      console.error('PUT /teams/score error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.post('/teams/:id/bonus', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE teams SET score = score + 0.5 WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('POST /teams/bonus error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

// Questions
app.get('/questions', (req, res) => {
  db.all('SELECT * FROM questions', [], (err, rows) => {
    if (err) {
      console.error('GET /questions error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/questions', (req, res) => {
  const { question, type, options, answer } = req.body;
  if (!question || !answer) {
    console.error('POST /questions error: Missing question or answer');
    return res.status(400).json({ error: 'Question and answer are required' });
  }
  db.run('INSERT INTO questions (question, type, options, answer) VALUES (?, ?, ?, ?)', 
    [question, type, JSON.stringify(options), answer], function(err) {
      if (err) {
        console.error('POST /questions error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Question added:', { id: this.lastID, question });
      res.json({ id: this.lastID, question, type, options, answer });
    });
});

app.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { question, type, options, answer } = req.body;
  db.run('UPDATE questions SET question = ?, type = ?, options = ?, answer = ? WHERE id = ?', 
    [question, type, JSON.stringify(options), answer, id], function(err) {
      if (err) {
        console.error('PUT /questions error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ changes: this.changes });
    });
});

app.delete('/questions/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM questions WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('DELETE /questions error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});