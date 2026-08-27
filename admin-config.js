'use strict';
/*
 * Локальная защита административного режима статического Small App.
 * Для полноценного общего управления городами на всех устройствах нужен серверный API.
 * Текущая конфигурация хранит только хеш пароля, а изменения списка — в localStorage браузера.
 */
window.MAXIM_ADMIN_CONFIG=Object.freeze({
  username:'pechenkin_am',
  passwordHash:'ca38cf03addc3106228e8dc289ad2417b1af1db1c2ced552317898ac762533a2',
  fallbackHash:'6a6136aa'
});
