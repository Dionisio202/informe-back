import express from 'express';

const app = express();
app.use(express.json());

const PORT = 3000;

app.get('/sd', (req, res) => {
    res.send('Hello World2!');
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
