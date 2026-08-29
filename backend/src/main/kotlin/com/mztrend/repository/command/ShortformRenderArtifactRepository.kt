package com.mztrend.repository.command

import com.mztrend.domain.ShortformRenderArtifact
import org.springframework.data.jpa.repository.JpaRepository

interface ShortformRenderArtifactRepository : JpaRepository<ShortformRenderArtifact, Long> {
    fun existsByArtifactHash(artifactHash: String): Boolean

    fun findByArtifactHash(artifactHash: String): ShortformRenderArtifact?

    fun findTopByShortformContentIdOrderByIdDesc(shortformContentId: Long): ShortformRenderArtifact?
}
