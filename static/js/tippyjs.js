import $ from "jquery";
import tippy, {delegate} from "tippy.js";

import render_left_sidebar_stream_setting_popover from "../templates/left_sidebar_stream_setting_popover.hbs";

import * as reactions from "./reactions";
import * as rows from "./rows";
import * as settings_data from "./settings_data";

// We override the defaults set by tippy library here,
// so make sure to check this too after checking tippyjs
// documentation for default properties.
tippy.setDefaultProps({
    // We don't want tooltips
    // to take more space than
    // mobile widths ever.
    maxWidth: 300,

    // Some delay to showing / hiding the tooltip makes
    // it look less forced and more natural.
    delay: [100, 20],
    placement: "auto",

    // disable animations to make the
    // tooltips feel snappy
    animation: false,

    // Show tooltips on long press on touch based
    // devices.
    touch: ["hold", 750],

    // This has the side effect of some properties of parent applying to
    // tooltips.
    appendTo: "parent",

    // html content is not supported by default
    // enable it by passing data-tippy-allowHtml="true"
    // in the tag or a parameter.
});

export function initialize() {
    delegate("body", {
        // Add elements here which are not displayed on
        // initial load but are displayed later through
        // some means.
        //
        // Make all html elements having this class
        // show tippy styled tooltip on hover.
        target: ".tippy-zulip-tooltip",
    });

    // message reaction tooltip showing who reacted.
    delegate("body", {
        target: ".message_reaction",
        placement: "bottom",
        onShow(instance) {
            const elem = $(instance.reference);
            const local_id = elem.attr("data-reaction-id");
            const message_id = rows.get_message_id(instance.reference);
            const title = reactions.get_reaction_title_data(message_id, local_id);
            instance.setContent(title);
        },
        // Insert directly into the `.message_reaction` element so
        // that when the reaction is hidden, tooltip hides as well.
        appendTo: (reference) => reference,
    });

    delegate("body", {
        target: ".compose_control_button",
        placement: "top",
        // Add some additional delay when they open
        // so that regular users don't have to see
        // them unless they want to.
        delay: [300, 20],
    });

    delegate("body", {
        target: ".message_control_button",
        placement: "top",
        // Add some additional delay when they open
        // so that regular users don't have to see
        // them unless they want to.
        delay: [300, 20],
        onShow(instance) {
            // Handle dynamic "starred messages" and "edit" widgets.
            const elem = $(instance.reference);
            let content = elem.attr("data-tippy-content");
            if (content === undefined) {
                // Tippy cannot get the content for message edit button
                // as it is dynamically inserted based on editability.
                // So, we have to manually get the i element to get the
                // content from it.
                //
                // TODO: Change the template structure so logic is unnecessary.
                const edit_button = elem.find("i.edit_content_button");
                content = edit_button.attr("data-tippy-content");
            }
            if (content === undefined) {
                // If content is still undefined it is because content
                // is specified on inner i tags and is handled by our
                // general tippy-zulip-tooltip class. So we return
                // false here to avoid showing an extra empty tooltip
                // for such cases.
                return false;
            }
            instance.setContent(content);
            return true;
        },
    });

    delegate("body", {
        delay: 0,
        target: "#streams_inline_cog",
        onShow(instance) {
            instance.setContent(
                render_left_sidebar_stream_setting_popover({
                    can_create_streams: settings_data.user_can_create_streams(),
                }),
            );
            $(instance.popper).on("click", instance.hide);
        },
        appendTo: () => document.body,
        trigger: "click",
        allowHTML: true,
        interactive: true,
        hideOnClick: true,
        theme: "light-border",
    });
}
