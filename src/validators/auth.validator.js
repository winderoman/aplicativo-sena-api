const { body } = require('express-validator');
const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'Pasaporte', 'PPT'];
const registerValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido.')
        .isEmail().withMessage('El email no es válido.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('La contraseña es requerida.')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
        .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una mayúscula.')
        .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número.'),

    body('ficha')
        .optional({ nullable: true, checkFalsy: true })
        //.trim().notEmpty().withMessage('La ficha es requerida.')
        .isLength({ max: 20 }).withMessage('La ficha no puede superar 20 caracteres.'),
    body('programa_formacion')
        .trim().notEmpty().withMessage('El programa de formación es requerido.')
        .isLength({ max: 200 }).withMessage('El programa no puede superar 200 caracteres.'),
    body('tipo_documento')
        .notEmpty().withMessage('El tipo de documento es requerido.')
        .isIn(TIPOS_DOCUMENTO).withMessage(`Tipo de documento inválido. Valores: ${TIPOS_DOCUMENTO.join(', ')}`),
    body('numero_documento')
        .trim().notEmpty().withMessage('El número de documento es requerido.')
        .isNumeric().withMessage('El número de documento debe ser numérico.')
        .isLength({ max: 30 }).withMessage('El número de documento no puede superar 30 caracteres.'),
    body('nombre_aprendiz')
        .notEmpty().withMessage('El Nombre es requerido.')
        .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres.'),
    body('telefono')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone().withMessage('El teléfono no es válido.'),
    body('fecha_inicio_etapa')
        .optional({ nullable: true, checkFalsy: true })
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha de inicio inválida. Formato: YYYY-MM-DD'),
    body('fecha_fin_etapa')
        .optional({ nullable: true, checkFalsy: true })
        .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha fin inválida. Formato: YYYY-MM-DD'),
];

const loginValidation = [
    body('email').trim().notEmpty().withMessage('El email es requerido.').isEmail().withMessage('Email inválido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.'),
];

module.exports = {
    registerValidation,
    loginValidation
};