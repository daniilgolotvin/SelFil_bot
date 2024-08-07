require('dotenv').config();
const { Bot, GrammyError, HttpError, Keyboard } = require('grammy');
const { hydrate } = require("@grammyjs/hydrate");

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

bot.api.setMyCommands([{ command: 'start', description: 'Start bot' }]);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// Главное меню
const mainKeyboard = new Keyboard()
  .text('Выбрать продукт')
  .text('Выбрать контейнер')
  .row()
  .text('Настроить автозаказ продуктов')
  .text('Заказать контейнер')
  .resized();

// Стартовое сообщение
bot.command('start', (ctx) => {
  state[ctx.from.id] = null; // Сброс состояния
  cart[ctx.from.id] = {}; // Сброс корзины
  ctx.reply('Привет, это SelFil бот для автоматического заказа продуктов и товаров, контроля остатков и сроков годности.', {
    reply_markup: mainKeyboard,
  });
});

// Состояния бота и корзины
let state = {};
let cart = {};
let autoOrderSettings = {};

// Обработка кнопки "Выбрать продукт"
bot.hears('Выбрать продукт', (ctx) => {
  state[ctx.from.id] = 'chooseProduct';
  ctx.reply('Выберите продукт:', {
    reply_markup: new Keyboard()
      .text('Молоко').text('Яйца')
      .row()
      .text('Сыр').text('Гречка')
      .row()
      .text('Закончить покупку')
      .row()
      .text('< Назад в меню!')
      .resized(),
  });
});

// Обработка выбора продукта
bot.hears(['Молоко', 'Яйца', 'Сыр', 'Гречка'], (ctx) => {
  if (state[ctx.from.id] === 'chooseProduct') {
    const product = ctx.message.text;
    if (!cart[ctx.from.id]) {
      cart[ctx.from.id] = {};
    }
    if (!cart[ctx.from.id][product]) {
      cart[ctx.from.id][product] = 0;
    }
    cart[ctx.from.id][product]++;
    ctx.reply(`Вы добавили ${product}. Теперь у вас ${cart[ctx.from.id][product]} в корзине.`, {
      reply_markup: new Keyboard()
        .text('Молоко').text('Яйца')
        .row()
        .text('Сыр').text('Гречка')
        .row()
        .text('Закончить покупку')
        .row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

// Обработка кнопки "Закончить покупку"
bot.hears('Закончить покупку', (ctx) => {
  if (cart[ctx.from.id] && Object.keys(cart[ctx.from.id]).length > 0) {
    let summary = 'Ваш список покупок:\n';
    for (const [product, quantity] of Object.entries(cart[ctx.from.id])) {
      summary += `${product}: ${quantity}\n`;
    }
    ctx.reply(summary, {
      reply_markup: mainKeyboard,
    });
    cart[ctx.from.id] = {}; // Очистить корзину после завершения покупки
  } else {
    ctx.reply('Ваша корзина пуста.', {
      reply_markup: mainKeyboard,
    });
  }
});

// Обработка кнопки "Выбрать контейнер"
bot.hears('Выбрать контейнер', (ctx) => {
  state[ctx.from.id] = 'chooseContainer';
  ctx.reply('Отсканируйте QR код или введите номер контейнера.');
});

// Обработка кнопки "Заказать контейнер"
bot.hears('Заказать контейнер', (ctx) => {
  ctx.reply('Выберите тип и размер контейнера на сайте [Selfil](http://www.Selfil.com)', {
    parse_mode: 'Markdown',
  });
});

// Обработка нажатия кнопки "Назад в меню"
bot.hears('< Назад в меню!', (ctx) => {
  state[ctx.from.id] = null; // Сброс состояния
  ctx.reply('Главное меню', {
    reply_markup: mainKeyboard,
  });
});

// Обработка кнопки "Настроить автозаказ продуктов"
bot.hears('Настроить автозаказ продуктов', (ctx) => {
  state[ctx.from.id] = 'setupAutoOrder';
  autoOrderSettings[ctx.from.id] = { products: [], interval: '', minQuantity: '' };
  ctx.reply('Выберите параметр для настройки автозаказа:', {
    reply_markup: new Keyboard()
      .text('Интервал автозаказа')
      .text('Список продуктов для автозаказа').row()
      .text('Минимальный остаток продуктов')
      .text('Завершить настройку автозаказа').row()
      .text('< Назад в меню!')
      .resized(),
  });
});

// Обработка выбора параметра для автозаказа
bot.hears(['Интервал автозаказа', 'Список продуктов для автозаказа', 'Минимальный остаток продуктов'], (ctx) => {
  const param = ctx.message.text;
  if (state[ctx.from.id] === 'setupAutoOrder') {
    if (param === 'Интервал автозаказа') {
      state[ctx.from.id] = 'chooseInterval';
      ctx.reply('Выберите интервал автозаказа:', {
        reply_markup: new Keyboard()
          .text('Ежедневно').text('Еженедельно')
          .row()
          .text('Ежемесячно').row()
          .text('< Назад в меню!')
          .resized(),
      });
    } else if (param === 'Список продуктов для автозаказа') {
      state[ctx.from.id] = 'chooseProduct';
      ctx.reply('Выберите продукт для автозаказа:', {
        reply_markup: new Keyboard()
          .text('Крупа').text('Кефир')
          .row()
          .text('Масло').text('Хлеб')
          .row()
          .text('Закончить выбор продуктов').row()
          .text('< Назад в меню!')
          .resized(),
      });
    } else if (param === 'Минимальный остаток продуктов') {
      state[ctx.from.id] = 'enterMinimum';
      ctx.reply('Введите минимальный остаток продукта.');
    }
  }
});

// Обработка выбора интервала автозаказа
bot.hears(['Ежедневно', 'Еженедельно', 'Ежемесячно'], (ctx) => {
  if (state[ctx.from.id] === 'chooseInterval') {
    autoOrderSettings[ctx.from.id].interval = ctx.message.text;
    state[ctx.from.id] = 'setupAutoOrder';
    ctx.reply(`Интервал автозаказа установлен: ${ctx.message.text}.`, {
      reply_markup: new Keyboard()
        .text('Интервал автозаказа')
        .text('Список продуктов для автозаказа').row()
        .text('Минимальный остаток продуктов')
        .text('Завершить настройку автозаказа').row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

// Обработка выбора продуктов для автозаказа
bot.hears(['Крупа', 'Кефир', 'Масло', 'Хлеб'], (ctx) => {
  if (state[ctx.from.id] === 'chooseProduct') {
    autoOrderSettings[ctx.from.id].products.push(ctx.message.text);
    ctx.reply(`Продукт ${ctx.message.text} добавлен в список для автозаказа.`, {
      reply_markup: new Keyboard()
        .text('Крупа').text('Кефир')
        .row()
        .text('Масло').text('Хлеб')
        .row()
        .text('Закончить выбор продуктов').row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

// Обработка кнопки "Закончить выбор продуктов"
bot.hears('Закончить выбор продуктов', (ctx) => {
  if (state[ctx.from.id] === 'chooseProduct') {
    state[ctx.from.id] = 'setupAutoOrder';
    ctx.reply('Список продуктов для автозаказа настроен.', {
      reply_markup: new Keyboard()
        .text('Интервал автозаказа')
        .text('Список продуктов для автозаказа').row()
        .text('Минимальный остаток продуктов')
        .text('Завершить настройку автозаказа').row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

// Обработка ввода минимального остатка продуктов
bot.on('message', (ctx) => {
  const currentState = state[ctx.from.id];

  if (currentState === 'enterMinimum') {
    autoOrderSettings[ctx.from.id].minQuantity = ctx.message.text;
    state[ctx.from.id] = 'setupAutoOrder';
    ctx.reply(`Минимальный остаток продуктов установлен: ${ctx.message.text}.`, {
      reply_markup: new Keyboard()
        .text('Интервал автозаказа')
        .text('Список продуктов для автозаказа').row()
        .text('Минимальный остаток продуктов')
        .text('Завершить настройку автозаказа').row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

// Обработка кнопки "Завершить настройку автозаказа"
bot.hears('Завершить настройку автозаказа', (ctx) => {
  const currentState = state[ctx.from.id];
  if (currentState && currentState.interval && currentState.products && currentState.minQuantity) {
    ctx.reply(`Автозаказ настроен:\nИнтервал: ${currentState.interval}\nПродукты: ${currentState.products.join(', ')}\nМинимальный остаток: ${currentState.minQuantity}`, {
      reply_markup: mainKeyboard,
    });
    state[ctx.from.id] = null; // Сброс состояния после настройки автозаказа
  } else {
    ctx.reply('Пожалуйста, завершите настройку всех параметров автозаказа.', {
      reply_markup: new Keyboard()
        .text('Интервал автозаказа').text('Список продуктов для автозаказа')
        .row()
        .text('Минимальный остаток продуктов').text('Завершить настройку автозаказа')
        .row()
        .text('< Назад в меню!')
        .resized(),
    });
  }
});

const containerActionsKeyboard = new Keyboard()
  .text('Просмотреть содержимое')
  .text('Добавить продукт')
  .row()
  .text('Удалить продукт')
  .text('Информация о контейнере')
  .row()
  .text('< Назад в меню!')
  .resized();

bot.hears('Выбрать контейнер', (ctx) => {
  state[ctx.from.id] = 'chooseContainer';
  ctx.reply('Отсканируйте QR код или введите номер контейнера.');
});

bot.on('message', (ctx) => {
  if (state[ctx.from.id] === 'chooseContainer') {
    const containerId = ctx.message.text;
    state[ctx.from.id] = { containerId, step: 'containerActions' };
    ctx.reply(`Контейнер ${containerId} выбран. Выберите действие:`, {
      reply_markup: containerActionsKeyboard,
    });
  }
});

bot.hears('Просмотреть содержимое', (ctx) => {
  if (state[ctx.from.id] && state[ctx.from.id].step === 'containerActions') {
    const { containerId } = state[ctx.from.id];
    // Здесь должно быть получение содержимого контейнера из базы данных
    ctx.reply(`Содержимое контейнера ${containerId}:\n- Продукт 1\n- Продукт 2`, {
      reply_markup: containerActionsKeyboard,
    });
  }
});

bot.hears('Добавить продукт', (ctx) => {
  if (state[ctx.from.id] && state[ctx.from.id].step === 'containerActions') {
    state[ctx.from.id].step = 'addProduct';
    ctx.reply('Введите название продукта, который вы хотите добавить в контейнер.');
  }
});

bot.hears('Удалить продукт', (ctx) => {
  if (state[ctx.from.id] && state[ctx.from.id].step === 'containerActions') {
    state[ctx.from.id].step = 'removeProduct';
    ctx.reply('Введите название продукта, который вы хотите удалить из контейнера.');
  }
});

bot.hears('Информация о контейнере', (ctx) => {
  if (state[ctx.from.id] && state[ctx.from.id].step === 'containerActions') {
    const { containerId } = state[ctx.from.id];
    // Здесь должно быть получение информации о контейнере из базы данных
    ctx.reply(`Информация о контейнере ${containerId}:\n- Дата создания: 01.01.2022\n- Тип контейнера: Обычный`, {
      reply_markup: containerActionsKeyboard,
    });
  }
});

bot.on('message', (ctx) => {
  const currentState = state[ctx.from.id];

  if (currentState && currentState.step === 'addProduct') {
    const product = ctx.message.text;
    // Здесь должно быть добавление продукта в контейнер в базе данных
    ctx.reply(`Продукт ${product} добавлен в контейнер ${currentState.containerId}.`, {
      reply_markup: containerActionsKeyboard,
    });
    state[ctx.from.id].step = 'containerActions';
  } else if (currentState && currentState.step === 'removeProduct') {
    const product = ctx.message.text;
    // Здесь должно быть удаление продукта из контейнера в базе данных
    ctx.reply(`Продукт ${product} удален из контейнер ${currentState.containerId}.`, {
      reply_markup: containerActionsKeyboard,
    });
    state[ctx.from.id].step = 'containerActions';
  }
});






bot.start();
