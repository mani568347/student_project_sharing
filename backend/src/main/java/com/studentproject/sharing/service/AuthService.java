package com.studentproject.sharing.service;

import com.studentproject.sharing.exception.DuplicateResourceException;
import com.studentproject.sharing.model.User;
import com.studentproject.sharing.payload.AuthResponse;
import com.studentproject.sharing.payload.LoginRequest;
import com.studentproject.sharing.payload.RegisterRequest;
import com.studentproject.sharing.repository.UserRepository;
import com.studentproject.sharing.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername();
        if (username == null || username.isBlank()) {
            // Generate username from email
            username = request.getEmail().split("@")[0];
            // Ensure uniqueness
            String baseUsername = username;
            int counter = 1;
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + counter;
                counter++;
            }
        } else if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username is already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already in use");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        userRepository.save(user);

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, request.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        return new AuthResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));
        return new AuthResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
    }

    public AuthResponse getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return new AuthResponse(null, user.getId(), user.getUsername(), user.getEmail(), user.getFullName());
    }
}