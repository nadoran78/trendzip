package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "shortform_render_artifacts")
class ShortformRenderArtifact(
    @Column(name = "shortform_content_id", nullable = false)
    var shortformContentId: Long = 0,
    @Column(name = "content_hash", nullable = false, length = 64)
    var contentHash: String = "",
    @Column(name = "artifact_hash", nullable = false, length = 64)
    var artifactHash: String = "",
    @Column(name = "source_manifest_hash", nullable = false, length = 64)
    var sourceManifestHash: String = "",
    @Column(name = "audio_manifest_hash", nullable = false, length = 64)
    var audioManifestHash: String = "",
    @Column(name = "render_props_hash", nullable = false, length = 64)
    var renderPropsHash: String = "",
    @Column(name = "video_hash", nullable = false, length = 64)
    var videoHash: String = "",
    @Column(name = "tts_model", nullable = false, length = 100)
    var ttsModel: String = "",
    @Column(name = "tts_voice", nullable = false, length = 100)
    var ttsVoice: String = "",
    @Column(name = "duration_millis", nullable = false)
    var durationMillis: Long = 0,
    @Column(nullable = false)
    var width: Int = 0,
    @Column(nullable = false)
    var height: Int = 0,
    @Column(nullable = false)
    var fps: Int = 0,
    @Column(name = "video_codec", nullable = false, length = 30)
    var videoCodec: String = "",
    @Column(name = "audio_codec", nullable = false, length = 30)
    var audioCodec: String = "",
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @PrePersist
    fun prePersist() {
        createdAt = LocalDateTime.now()
    }
}
