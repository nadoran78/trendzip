package com.mztrend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class MzTrendApplication

fun main(args: Array<String>) {
    runApplication<MzTrendApplication>(*args)
}
