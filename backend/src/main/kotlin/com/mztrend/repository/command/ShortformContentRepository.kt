package com.mztrend.repository.command

import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformPlatform
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ShortformContentRepository : JpaRepository<ShortformContent, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select content from ShortformContent content where content.id = :id")
    fun findByIdForUpdate(
        @Param("id") id: Long,
    ): ShortformContent?

    fun existsByContentHash(contentHash: String): Boolean

    fun existsByPlatformAndEventKeyAndStatusIn(
        platform: ShortformPlatform,
        eventKey: String,
        statuses: Collection<ShortformContentStatus>,
    ): Boolean
}
