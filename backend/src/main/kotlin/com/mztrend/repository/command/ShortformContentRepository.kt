package com.mztrend.repository.command

import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformPlatform
import org.springframework.data.jpa.repository.JpaRepository

interface ShortformContentRepository : JpaRepository<ShortformContent, Long> {
    fun existsByContentHash(contentHash: String): Boolean

    fun existsByPlatformAndEventKeyAndStatusIn(
        platform: ShortformPlatform,
        eventKey: String,
        statuses: Collection<ShortformContentStatus>,
    ): Boolean
}
