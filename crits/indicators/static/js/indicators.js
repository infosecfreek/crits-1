var threat_type_load = true;
var attack_type_load = true;
var available_threat_types = [];
var available_attack_types = [];
$(document).ready(function() {
    $('[id^="accordion"]').accordion({
                    collapsible: true,
                    active: false,
                    autoHeight: false,
                    navigation: true
    });

    $('.slider').slider({
        min:1,
        max:5,
        step:1,
        slide:function(e, ui) {
            $(this).css('background',$(this).data('colors')[ui.value]);
            $(this).find("a:first").text($(this).data('confs')[ui.value-1]);
        },
        create:function(e, ui) {
            //var confs = {'unknown': 1, 'benign': 2, 'low': 3, 'medium': 4,
            //'high': 5};
            var confs = ['unknown', 'benign', 'low', 'medium', 'high'];
            var rating = confs.indexOf($(this).attr('rating'))+1;
            var colors = {1:"gray", 2:"green", 3:"yellow", 4:"orange", 5:"red"};

            $(this).slider('value', rating);
            $(this).data('colors', colors);
            $(this).data('confs', confs);
            $(this).css('background',$(this).data('colors')[rating]);
            $(this).find("a:first").text($(this).data('confs')[rating-1]);
        },
        stop:function(e, ui) {
            $.ajax({
                type: "POST",
                data: {'value':$(this).data('confs')[ui.value-1]},
                url: $(this).attr('action'),
                success: function(data) {
                    if (!data.success && data.message) {
                        error_message_dialog('Update Analysis Error', data.message);
                    }
                }
            });
        }
    }).css('width',"38%");

    // XXXX Some of this needs to be converted.
    $("#download-indicator-form").dialog({
        autoOpen: false,
        modal: true,
        width: "auto",
        height: "auto",
        buttons: {
            "Download Indicator": function () {
                $("#form-download-indicator").submit();
                $(this).dialog("close");
            },
            "Cancel": function() {
                $(this).dialog("close");
            },
        },

        create: function() {
            var meta = $("#id_meta_format");
            var bin = $("#id_binary_format");
            var no_meta = $(meta).children("option[value='none']");
            var no_bin = $(bin).children("option[value='none']");

            //Makes no sense to download empty file, so either binaries or metadata have to be downloaded.
            //don't allow user to select downloading neither
            var mutually_exc = function(e) {
                //alert($(primary).prop("selected"));
              var elem = e.data['elem'];
                if ($(this).val() == "none") {
                    $(elem).hide();
                } else {
                    $(elem).show();
                }
            };
            meta.change({elem: no_bin}, mutually_exc);
            bin.change({elem: no_meta}, mutually_exc);
        },

        close: function() {
            // allFields.val("").removeClass("ui-state-error");
        },
    });

    var localDialogs = {
	"download-indicator": {title: "Download Indicator", href:"",
			       submit: function(e) {
		$("#form-download-indicator").submit();
                $(this).dialog("close");
	    }},
	"add-activity": {title: "Activity", href:"",
			 update: { open: update_dialog} },

    };

    $.each(localDialogs, function(id,opt) {
	    stdDialog(id,opt);
	});

    //edit type in place
    $('#indicator_type.edit').editable(function(value, settings) {
        var revert = this.revert;
        return function(value, settings, elem) {
            $.ajax({
                type:"POST",
                async:false,
                url:$(elem).attr('action'),
                data: {'type':value},
                success: function(data) {
                    if (!data.success) {
                        value = revert;
                        $("#indicator_type_error").addClass('ui-icon');
                        $("#indicator_type_error").removeClass('ui-icon-circle-check');
                        $("#indicator_type_error").addClass('ui-icon-alert');
                        $("#indicator_type_error").attr("title", "Duplicate Indicator detected");
                    } else {
                        $("#indicator_type_error").addClass('ui-icon');
                        $("#indicator_type_error").removeClass('ui-icon-alert');
                        $("#indicator_type_error").addClass('ui-icon-circle-check');
                        $("#indicator_type_error").attr("title", "Success!");
                    }
                },
            });
            return value;
        }(value, settings, this);
    },
    {
        type:'select',
        data: (function() {
            var dtypes = {};
            var sorted = [];
            $.ajax({
                type: "POST",
                async: false,
                url: get_indicator_type_dropdown,
                data: {'type': 'indicator_type'},
                success: function(data) {
                    $.each(data.types, function(key, value) {
                        sorted.push(key);
                    });
                    sorted.sort();
                    len = sorted.length;
                    for (var i=0; i < len; i++) {
                        dtypes[sorted[i]] = sorted[i];
                    }
                }
            });
            return dtypes;
        }),
        style:'display:inline',
        submit:'OK'
    });

    populate_id(indicator_id, 'Indicator');
    details_copy_id('Indicator');
    toggle_favorite('Indicator');

    $("#threat_type_list").tagit({
        allowSpaces: true,
        allowDuplicates: false,
        removeCOnfirmation: true,
        showAutocompleteOnFocus: true,
        beforeTagAdded: function(event, ui) {
            if (available_threat_types.indexOf(ui.tagLabel) == -1) {
                return false;
            }
            if (ui.tagLabel == "not found") {
                return false;
            }
        },
        beforeTagRemoved: function(event, ui) {
            var my_threat_types = $("#threat_type_list").tagit("assignedTags");
            if (my_threat_types.length <= 1) {
                return false;
            }
        },
        afterTagAdded: function(event, ui) {
            var my_threat_types = $("#threat_type_list").tagit("assignedTags");
            update_threat_types(my_threat_types);
        },
        afterTagRemoved: function(event, ui) {
            var my_threat_types = $("#threat_type_list").tagit("assignedTags");
            update_threat_types(my_threat_types);
        },
        onTagClicked: function(event, ui) {
            var url = ta_search + "?search_type=global&q=type%3Aindicator+field%3Athreat_types+" + ui.tagLabel;
            window.open(url, '_blank');
        },
        availableTags: (function() {
            var tmp = [];
            $.ajax({
                async: false,
                type: "POST",
                url: threat_type_list,
                data: {},
                datatype: 'json',
                success: function(data) {
                    available_threat_types = tmp = data;
                }
            });
            return tmp;
        })(),
        autocomplete: {
            delay: 0,
            minLength: 0,
        },
    });
    $("#attack_type_list").tagit({
        allowSpaces: true,
        allowDuplicates: false,
        removeCOnfirmation: true,
        showAutocompleteOnFocus: true,
        beforeTagAdded: function(event, ui) {
            if (available_attack_types.indexOf(ui.tagLabel) == -1) {
                return false;
            }
            if (ui.tagLabel == "not found") {
                return false;
            }
        },
        beforeTagRemoved: function(event, ui) {
            var my_attack_types = $("#attack_type_list").tagit("assignedTags");
            if (my_attack_types.length <= 1) {
                return false;
            }
        },
        afterTagAdded: function(event, ui) {
            var my_attack_types = $("#attack_type_list").tagit("assignedTags");
            update_attack_types(my_attack_types);
        },
        afterTagRemoved: function(event, ui) {
            var my_attack_types = $("#attack_type_list").tagit("assignedTags");
            update_attack_types(my_attack_types);
        },
        onTagClicked: function(event, ui) {
            var url = ta_search + "?search_type=global&q=type%3Aindicator+field%3Athreat_types+" + ui.tagLabel;
            window.open(url, '_blank');
        },
        availableTags: (function() {
            var tmp = [];
            $.ajax({
                async: false,
                type: "POST",
                url: attack_type_list,
                data: {},
                datatype: 'json',
                success: function(data) {
                    available_attack_types = tmp = data;
                }
            });
            return tmp;
        })(),
        autocomplete: {
            delay: 0,
            minLength: 0,
        },
    });
    function update_threat_types(my_threat_types) {
        if (!threat_type_load) {
            var data = {
                        'threat_types': my_threat_types.toString(),
            };
            $.ajax({
                type: "POST",
                url: threat_type_modify,
                data: data,
                datatype: 'json',
            });
        }
    }
    function update_attack_types(my_attack_types) {
        if (!attack_type_load) {
            var data = {
                        'attack_types': my_attack_types.toString(),
            };
            $.ajax({
                type: "POST",
                url: attack_type_modify,
                data: data,
                datatype: 'json',
            });
        }
    }
    $(document).trigger('enable_threat_types');
    $(document).trigger('enable_attack_types');
}); //document.ready
