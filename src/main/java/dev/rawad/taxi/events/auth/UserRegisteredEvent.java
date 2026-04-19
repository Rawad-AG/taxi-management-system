package dev.rawad.taxi.events.auth;

import dev.rawad.taxi.auth.entities.UserEntity;

public record UserRegisteredEvent(UserEntity user) {

}
