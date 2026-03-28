import express from 'express';
import cookieParser from 'cookie-parser';
import debug from 'debug';
import { compare, genSalt, hash } from 'bcrypt';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { } from 'connect'

const logger = {
    info: debug.debug('app'),
    err: debug.debug('app'),
};
logger.info.log = console.log.bind(console);

const USERS_DB = 'users.json';
const SESSIONS_DB = 'sessions.json';

const port = process.env.PORT || 3000;
const data = process.env.DB || './data';

const users_db_path = join(data, USERS_DB);
const sessions_db_path = join(data, SESSIONS_DB);

if (!existsSync(sessions_db_path) || !existsSync(users_db_path)) {
    await mkdir(data, { recursive: true });
    await writeFile(users_db_path, JSON.stringify([]));
    await writeFile(sessions_db_path, JSON.stringify([]));
}

const users_db = new Map(
    await readFile(users_db_path, 'utf-8').then(JSON.parse),
);
const sessions_db = new Map(
    await readFile(sessions_db_path, 'utf-8').then(JSON.parse),
);

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(compression())
app.use(express.static('public'))

app.use((req, res, next) => {
    res.on('finish', () =>
        logger.info(
            req.method,
            decodeURI(req.url),
            res.statusCode,
            res.statusMessage,
        ),
    );
    next();
});

app.get('/health', (_, res) => {
    res.send({
        name: process.env.npm_package_name,
        version: process.env.npm_package_version,
    });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) return res.sendStatus(400);

    try {
        for (const user of users_db.values()) {
            if (user.username === username) {
                const result = await new Promise((resolve, reject) => {
                    compare(password, user.password, (err, result) => {
                        if (err) return reject(err);
                        return resolve(result);
                    });
                });

                if (result) {
                    const id = randomUUID();
                    const expires_in = 7 * 24 * 3600000;
                    const expire_at = Date.now() + expires_in;

                    sessions_db.set(id, { id, user_id: user.id, expire_at });

                    res.cookie('sid', id, {
                        maxAge: expires_in,
                        httpOnly: true,
                        secure: true,
                        sameSite: 'strict',
                    });

                    return res.sendStatus(201);
                }

                break;
            }
        }
    } catch (err) {
        logger.err(err);
        return res.sendStatus(500);
    }

    res.sendStatus(401);
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) return res.sendStatus(400);

    for (const user of users_db.values()) {
        if (user.username) {
            return res.sendStatus(209);
        }
    }

    try {
        const p_hash = await new Promise((resolve, reject) => {
            genSalt(10, (err, salt) => {
                if (err) return reject(err);
                hash(password, salt, (err, hash) => {
                    if (err) return reject(err);
                    return resolve(hash);
                });
            });
        });

        const id = randomUUID();
        users_db.set(id, { id, username, password: p_hash, data: {} });

        return res.sendStatus(201);
    } catch (err) {
        logger.err(err);
        return res.sendStatus(500);
    }
});

app.use((req, res, next) => {
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    const sid = req.cookies['sid'];

    if (sid && sessions_db.has(sid)) {
        req.session = sessions_db.get(sid);
        req.session.user = users_db.get(req.session.user_id);
        return next();
    }

    res.sendStatus(401);
});

app.post('/api/logout', (req, res) => {
    sessions_db.delete(req.session.id);
    res.sendStatus(201);
});

app.get('/api/store', async (req, res) => {
    res.send(req.session.user.data);
});

app.post('/api/store', async (req, res) => {
    users_db.set(req.session.user.id, { ...req.session.user, data: req.body });
    res.sendStatus(201);
});

app.listen(port, () => {
    logger.info(`Example app listening on port ${port}`);
});

setInterval(async () => {
    logger.info('Clean interval.');

    const now = new Date();

    const to_clean = [];
    for (const session of sessions_db.values()) {
        if (session.expire_at < now) {
            to_clean.push(session.id);
        }
    }

    for (const sid of to_clean) {
        sessions_db.delete(sid);
    }

    await writeFile(users_db_path, JSON.stringify(Array.from(users_db)));
    await writeFile(sessions_db_path, JSON.stringify(Array.from(sessions_db)));
}, 60 * 1000);

async function exit(signal) {
    console.log(`Exit signal: ${signal}`);
    await writeFile(users_db_path, JSON.stringify(Array.from(users_db)));
    await writeFile(sessions_db_path, JSON.stringify(Array.from(sessions_db)));
    process.exit(0);
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGILL', exit);
