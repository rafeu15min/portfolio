use crate::{
    AppState,
    content::{Project, TimelineEntry},
};
use axum::{Json, extract::State};
use std::sync::Arc;

pub async fn projects(State(s): State<Arc<AppState>>) -> Json<Vec<Project>> {
    Json(s.content.projects.clone())
}

pub async fn timeline(State(s): State<Arc<AppState>>) -> Json<Vec<TimelineEntry>> {
    Json(s.content.timeline.clone())
}
