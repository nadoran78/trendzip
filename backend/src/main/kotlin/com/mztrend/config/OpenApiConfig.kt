package com.mztrend.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.servers.Server
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
    @Bean
    fun trendzipOpenApi(): OpenAPI =
        OpenAPI()
            .info(
                Info()
                    .title("Trendzip API")
                    .description("MZ 트렌드 피드 및 키워드 API")
                    .version("v1"),
            ).servers(
                listOf(
                    Server()
                        .url("http://localhost:8080")
                        .description("Local"),
                    Server()
                        .url("https://api-trendzip.nadoran.com")
                        .description("Production"),
                ),
            )
}
