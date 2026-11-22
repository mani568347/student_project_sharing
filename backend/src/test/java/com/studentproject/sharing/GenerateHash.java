package com.studentproject.sharing;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        String hash = enc.encode("password123");
        System.out.println("Hash: " + hash);
        System.out.println("Matches: " + enc.matches("password123", hash));
    }
}
