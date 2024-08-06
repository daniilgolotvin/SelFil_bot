require('dotenv').config();
const { Bot, GrammyError, HttpError, Keyboard } = require('grammy');
const { hydrate } = require("@grammyjs/hydrate");

const bot = new Bot(process.env.BOT_API_KEY);
bot.use(hydrate());

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

// Обработка кнопки "Настроить автозаказ продуктов"
bot.hears('Настроить автозаказ продуктов', (ctx) => {
  state[ctx.from.id] = 'setupAutoOrder';
  ctx.reply('Выберите продукт для автозаказа:', {
    reply_markup: new Keyboard()
      .text('Молоко').text('Яйца')
      .row()
      .text('Сыр').text('Гречка')
      .row()
      .text('< Назад в меню!')
      .resized(),
  });
});

// Обработка выбора продукта для автозаказа
bot.hears(['Молоко', 'Яйца', 'Сыр', 'Гречка'], (ctx) => {
  if (state[ctx.from.id] === 'setupAutoOrder') {
    state[ctx.from.id] = { product: ctx.message.text, step: 'enterContainer' };
    ctx.reply('Введите номер контейнера или отсканируйте QR код на контейнере.');
  }
});

// Обработка ввода номера контейнера для автозаказа
bot.on('message', (ctx) => {
  const currentState = state[ctx.from.id];

  if (currentState && currentState.step === 'enterContainer') {
    currentState.container = ctx.message.text;
    currentState.step = 'enterMinimum';
    ctx.reply('Введите минимальный остаток продукта.');
  } else if (currentState && currentState.step === 'enterMinimum') {
    currentState.minQuantity = ctx.message.text;
    currentState.step = 'chooseInterval';
    ctx.reply('Выберите интервал автозаказа:', {
      reply_markup: new Keyboard()
        .text('Ежедневно').text('Еженедельно')
        .row()
        .text('Ежемесячно').text('< Назад в меню!')
        .resized(),
    });
  } else if (currentState && currentState.step === 'chooseInterval' && ['Ежедневно', 'Еженедельно', 'Ежемесячно'].includes(ctx.message.text)) {
    currentState.interval = ctx.message.text;
    ctx.reply(`Автозаказ настроен для продукта ${currentState.product} в контейнере ${currentState.container} с минимальным остатком ${currentState.minQuantity} и интервалом ${currentState.interval}.`, {
      reply_markup: mainKeyboard,
    });
    state[ctx.from.id] = null; // Сброс состояния после настройки автозаказа
  }
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

bot.start();
