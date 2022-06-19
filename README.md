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


# Збірки для Safari | Safari Workflows

Для Safari додані наступні команди збірок:

## Збірка для релізу | Build for Release

```sh
$ npm install .
$ SAFARI=1 npm run prod
$ npm run safari:build
```

## Збірка та запуск розширення | Build and open

```sh
$ npm install .
$ SAFARI=1 npm run prod
$ npm run safari:start
```

## Збірка для неперервної розробки | Development workflow


```sh
$ npm install .
$ SAFARI=1 npm run prod -- --watch
```

У іншому вікні терміналу запускаємо:

```sh
$ npm run safari:dev
```


## Процес налаштування розширення у Safari:

Додаток буде додано у Safari, але він не функціонуватиме. Потрібно зробити наступні додаткові рухи:

- У вікні налаштувань Safari (якщо запускати `npm run safari:start`, відкриється автоматично), потрібно активувати розширення. Якщо розширення не висвічується у списку, потрібно [дозволити запуск непідписаних розширень, дивись: Enable Your App Extension in Safari](https://developer.apple.com/documentation/safariservices/safari_app_extensions/building_a_safari_app_extension).

- Пройди процес внутрішнього налаштування ЛУ через параметри розширення (як і в інших браузерах). 

- Після цього, при переході на сторінку, де має бути активним розширення (наприклад google.com), у панелі інструментів потрібно відкрити розширення і одноразово дати згоду на доступ до даних сторінки(нок).
