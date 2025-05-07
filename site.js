// server.js

// Імпорт необхідних модулів
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // Для парсингу тіла запитів
const validator = require('validator'); // Для валідації даних
require('dotenv').config(); // Для завантаження змінних середовища з .env файлу

// Ініціалізація Express-додатку
const app = express();
const PORT = process.env.PORT || 3000; // Порт з .env або 3000 за замовчуванням

// Middleware
app.use(bodyParser.json()); // Дозволяє парсити JSON дані з тіла запиту
app.use(bodyParser.urlencoded({ extended: true })); // Дозволяє парсити URL-encoded дані

// Дозволяємо CORS-запити (Cross-Origin Resource Sharing)
// Це важливо, якщо ваш фронтенд і бекенд працюють на різних портах/доменах під час розробки
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Дозволити доступ з будь-якого джерела (для розробки)
    // Для продакшену краще вказати конкретний домен фронтенду:
    // res.setHeader('Access-Control-Allow-Origin', 'http://your-frontend-domain.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Відповідаємо на preflight запити
    }
    next();
});


// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB успішно підключено!'))
.catch(err => {
    console.error('Помилка підключення до MongoDB:', err);
    process.exit(1);
});

// Схема та модель для заявки (Feedback/Application)
const applicationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Ім'я є обов'язковим полем"],
        trim: true,
        minlength: [2, "Ім'я повинно містити щонайменше 2 символи"],
    },
    email: {
        type: String,
        required: [true, "Email є обов'язковим полем"],
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Будь ласка, введіть коректний email'],
    },
    phone: {
        type: String,
        trim: true,
        // Проста валідація для українських номерів (можна розширити)
        validate: {
            validator: function(v) {
                // Дозволяє порожнє значення або валідний телефон
                if (!v) return true; // Телефон необов'язковий
                return validator.isMobilePhone(v, 'uk-UA'); // Перевірка для українських номерів
            },
            message: props => `${props.value} не є коректним номером телефону!`
        },
    },
    service: {
        type: String,
        trim: true,
    },
    message: {
        type: String,
        required: [true, "Повідомлення є обов'язковим полем"],
        trim: true,
        minlength: [10, "Повідомлення повинно містити щонайменше 10 символів"],
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
});

const Application = mongoose.model('Application', applicationSchema);

// Маршрути API
// POST-запит для обробки даних з контактної форми
app.post('/api/submit-form', async (req, res) => {
    try {
        // Отримуємо дані з тіла запиту
        const { name, email, phone, service, message } = req.body;

        // Створюємо новий екземпляр моделі Application
        const newApplication = new Application({
            name,
            email,
            phone,
            service,
            message,
        });

        // Валідація та збереження в базу даних
        // Mongoose автоматично виконає валідацію на основі схеми перед збереженням
        const savedApplication = await newApplication.save();

        // Відправляємо успішну відповідь клієнту
        res.status(201).json({
            success: true,
            message: 'Заявку успішно відправлено та збережено!',
            data: savedApplication,
        });

    } catch (error) {
        // Обробка помилок валідації або інших помилок
        if (error.name === 'ValidationError') {
            // Збираємо повідомлення про помилки валідації
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Помилка валідації даних.',
                errors: errors,
            });
        }
        // Інші типи помилок
        console.error('Помилка при збереженні заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера. Не вдалося обробити ваш запит.',
        });
    }
});

// Базовий маршрут для перевірки роботи сервера
app.get('/', (req, res) => {
    res.send('Сервер маркетингового агентства працює!');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
});
