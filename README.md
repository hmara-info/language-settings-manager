# language-settings-manager
Лагідна українізація

Шлях до мети починається тут.

![plot](./banner.jpeg)


## Збірка | Build

```sh
$ npm install .
$ npm run prod
```

Розпакована версія розширення буде зібрана в теці `./build`


# Safari
## Збірка для Safari

```sh
$ npm install .
$ SAFARI=1 npm run prod
$ npm run safari:start
```

## Збірка для Safari для неперервної розробки


```sh
$ npm install .
$ SAFARI=1 npm run prod -- --watch
```

Запускаємо watcher процес у іншому вікні терміналу:

```sh
$ npm run safari:dev
```


## Процес налаштування розширення:

Додаток буде доданой у Safari, але не функціонуватиме. Потрібно зробити такі додаткові рухи:

- У вікні налаштувань Safari (автоматично відкриється), потрібно активувати розширення. Якщо розширення немає, потрібно [дозволити запуск непідписаних розширень, дивись: Enable Your App Extension in Safari](https://developer.apple.com/documentation/safariservices/safari_app_extensions/building_a_safari_app_extension).

- Пройди процес внутрішнього налаштування ЛУ через параметри розширення (як і в інших браузерах). 

- Після цього, при переході на сторінку, де має бути активним розширення (наприклад google.com), у панелі інструментів потрібно відкрити розширення і одноразово дати згоду на доступ до даних сторінки(нок).
