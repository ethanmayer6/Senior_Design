package com.sdmay19.courseflow.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import org.springframework.web.servlet.resource.ResourceResolverChain;
import java.util.List;
import static java.util.Objects.nonNull;

@Configuration
public class SpringConfiguration implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        this.serveDirectory(registry, "/", "classpath:/static/");
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

    public static final PasswordEncoder BCRYPT = new BCryptPasswordEncoder();

    @Bean
    public InMemoryUserDetailsManager inMemoryUserDetailsManager() {
        UserDetails user = User.builder()
                .username("Test")
                .password(BCRYPT.encode("abc123"))
                .build();
        return new InMemoryUserDetailsManager(user);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return BCRYPT;
    }

    @Bean
    @SneakyThrows
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) {
        return httpSecurity
                .httpBasic(config -> {})
                .csrf(config -> config.disable())
                .authorizeHttpRequests(config -> {
                    config
                            .requestMatchers("/api/ping").permitAll()
                            .requestMatchers("/testdata/**").permitAll()
                            .requestMatchers("/api/users/**").permitAll()
                            .anyRequest().authenticated();
                })
                .sessionManagement(config -> {
                    config.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
                })
                .build();
    }


}
