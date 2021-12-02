const config = require('config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ username, password }) {
    const user = await db.User.scope('withHash').findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.hash)))
        throw 'Usuario o contraseña incorrectos';

    const token = jwt.sign({ sub: user.id }, config.secret, { expiresIn: '7d' });
    return {...omitHash(user.get()), token };
}

async function getAll() {
    return await db.User.findAll();
}

async function getById(id) {
    return await getUser(id);
}

async function create(params) {
    if (await db.User.findOne({ where: { username: params.username } })) {
        throw 'El usuario "' + params.username + '" ya existe';
    }

    if (params.password) {
        params.hash = await bcrypt.hash(params.password, 10);
    }

    await db.User.create(params);
}

async function update(id, params) {
    const user = await getUser(id);

    const usernameChanged = params.username && user.username !== params.username;
    if (usernameChanged && await db.User.findOne({ where: { username: params.username } })) {
        throw 'El usuario "' + params.username + '" ya existe';
    }

    if (params.password) {
        params.hash = await bcrypt.hash(params.password, 10);
    }

    Object.assign(user, params);
    await user.save();

    return omitHash(user.get());
}

async function _delete(id) {
    const user = await getUser(id);
    await user.destroy();
}

async function getUser(id) {
    const user = await db.User.findByPk(id);
    if (!user) throw 'Usuario no encontrado';
    return user;
}

function omitHash(user) {
    const { hash, ...userWithoutHash } = user;
    return userWithoutHash;
}