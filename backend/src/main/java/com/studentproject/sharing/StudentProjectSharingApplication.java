package com.studentproject.sharing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories("com.studentproject.sharing.repository")
public class StudentProjectSharingApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudentProjectSharingApplication.class, args);
    }
}