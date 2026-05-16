package com.example.Ai_Expense_Tracker.security;


import com.example.Ai_Expense_Tracker.entity.Role;
import com.example.Ai_Expense_Tracker.entity.User;
import com.example.Ai_Expense_Tracker.repository.UserRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public @NonNull UserDetails loadUserByUsername(@NonNull String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Collection<GrantedAuthority> authorities = toAuthorities(user.getRoles());
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities(authorities)
                .accountLocked(user.isLocked())
                .build();
    }

    private Collection<GrantedAuthority> toAuthorities(Set<Role> roles) {
        Set<Role> safeRoles = (roles == null || roles.isEmpty())
                ? Collections.singleton(Role.ROLE_USER)
                : roles;
        return safeRoles.stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .collect(Collectors.toSet());
    }
}
