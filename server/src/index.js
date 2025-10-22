import 'dotenv/config';
import app from './server.js';
const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`SIGLAD API listening on http://localhost:${PORT}`));
app.listen(PORT, () => console.log(`SIGLAD API listening on http://0.0.0.0:${PORT}`));
