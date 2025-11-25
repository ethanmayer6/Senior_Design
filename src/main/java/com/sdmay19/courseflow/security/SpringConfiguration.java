package com.sdmay19.courseflow.security;

import java.util.List;
import static java.util.Objects.nonNull;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import org.springframework.web.servlet.resource.ResourceResolverChain;

import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;

/*
 *
 * This class defines the central Spring Security and Web MVC configuration
 * for the CourseFlow application. It performs three major responsibilities:
 *
 * 1. **Frontend Serving**
 *    - Configures Spring to serve static frontend assets (the Vite build)
 *      located in `classpath:/static/`.
 *    - Uses a custom `PathResourceResolver` to handle client-side routing
 *      by serving `index.html` for unknown routes (enabling SPA navigation).
 *
 * 2. **Security Configuration**
 *    - Disables CSRF protection (appropriate for stateless APIs using JWT).
 *    - Defines which endpoints are publicly accessible (e.g., `/api/users/login`).
 *    - Requires authentication for all other API routes.
 *    - Configures stateless session management since JWTs are used instead
 *      of server-side sessions.
 *    - Registers a custom `JwtAuthenticationFilter` before the built-in
 *      `UsernamePasswordAuthenticationFilter` to process incoming JWT tokens.
 *
 * 3. **Authentication & Password Handling**
 *    - Defines a global `BCryptPasswordEncoder` bean for secure password hashing.
 *    - Provides an in-memory `UserDetailsService` with a test user
 *      (`username` / `password`) to satisfy Spring Security’s requirement
 *      for a user source during startup.
 *
 * Overall, this configuration integrates the Spring Boot backend with a Vite-built
 * frontend and secures API endpoints using JWT-based authentication in a stateless manner.
 */

@Configuration
public class SpringConfiguration implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String uploadDir;

    // SERVING FRONTENT BUILD
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        this.serveDirectory(registry, "/", "classpath:/static/");
        registry.addResourceHandler("/uploads/profile-pictures/**")
                .addResourceLocations("file:" + uploadDir + "/");
    }
    private void serveDirectory(ResourceHandlerRegistry registry, String endpoint, String location) {
        // 1
        String[] endpointPatterns = endpoint.endsWith("/")
                ? new String[]{endpoint.substring(0, endpoint.length() - 1), endpoint, endpoint + "**"}
                : new String[]{endpoint, endpoint + "/", endpoint + "/**"};
        registry
                // 2
                .addResourceHandler(endpointPatterns)
                .addResourceLocations(location.endsWith("/") ? location : location + "/")
                .resourceChain(false)
                // 3
                .addResolver(new PathResourceResolver() {
                    @Override
                    public Resource resolveResource(HttpServletRequest request, String requestPath, List<? extends Resource> locations, ResourceResolverChain chain) {
                        Resource resource = super.resolveResource(request, requestPath, locations, chain);
                        if (nonNull(resource)) {
                            return resource;
                        }
                        return super.resolveResource(request, "/index.html", locations, chain);
                    }
                });
    }

    // PASSWORD HASHING
    public static final PasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    @Bean
    public PasswordEncoder passwordEncoder() {
        return BCRYPT;
    }

    // MAIN SECURITY CONFIG
    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;


    @Bean
    @SneakyThrows
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/ping", "/testdata/**", "/api/users/register", "/api/users/login", "/api/users/check-email", "/api/courses/**", "/api/majors/**", "/api/requirementgroup/**", "/api/degreerequirement/**", "/api/flowchart/**", "/api/semester/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .userDetailsService(userDetailsService())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }


    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173")); // ✅ your React app
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // allows Authorization header & cookies

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }


    // IN MEMORY USER TO PROMPT SPRING SECURITY
    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails user = User.builder()
                .username("username")
                .password(passwordEncoder().encode("password"))
                .roles("USER")
                .build();
        System.out.println("Loaded test user: username/password");
        return new InMemoryUserDetailsManager(user);
    }

}