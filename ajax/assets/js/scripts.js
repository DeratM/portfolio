function calculate() {
    "use strict";

    // Get a reference to the form - Use the ID of the form
    var form = $( "#myform" );
    
    // If all of the form elements are valid, the get the form values
    if (form.valid()) {
        
        // Operand 1
        var Operand1 = document.getElementById("Operand1").value;        

        // Operator
    
        var FromUnit;
        if (document.getElementById("cmOperator").checked) {
            FromUnit = document.getElementById("cmOperator").value;
        }
        if (document.getElementById("mOperator").checked) {
            FromUnit = document.getElementById("mOperator").value;
        }
        if (document.getElementById("kmOperator").checked) {
            FromUnit = document.getElementById("kmOperator").value;
        }
        if (document.getElementById("inOperator").checked) {
            FromUnit = document.getElementById("inOperator").value;
        }
        if (document.getElementById("ftOperator").checked) {
            FromUnit = document.getElementById("ftOperator").value;
        }
        if (document.getElementById("ydOperator").checked) {
            FromUnit = document.getElementById("ydOperator").value;
        }
        if (document.getElementById("miOperator").checked) {
            FromUnit = document.getElementById("miOperator").value;
        }
       
        var ToUnit;
        if (document.getElementById("To-cm-Operator").checked) {
            ToUnit = document.getElementById("To-cm-Operator").value;
        }
        if (document.getElementById("To-m-Operator").checked) {
            ToUnit = document.getElementById("To-m-Operator").value;
        }
        if (document.getElementById("To-km-Operator").checked) {
            ToUnit = document.getElementById("To-km-Operator").value;
        }
        if (document.getElementById("To-in-Operator").checked) {
            ToUnit = document.getElementById("To-in-Operator").value;
        }
        if (document.getElementById("To-ft-Operator").checked) {
            ToUnit = document.getElementById("To-ft-Operator").value;
        }
        if (document.getElementById("To-yd-Operator").checked) {
            ToUnit = document.getElementById("To-yd-Operator").value;
        }
        if (document.getElementById("To-mi-Operator").checked) {
            ToUnit = document.getElementById("To-mi-Operator").value;
        }

        CalculateResult(Operand1, FromUnit, ToUnit);
    }
}

async function CalculateResult(Operand1, FromUnit, ToUnit) {
        
        // URL and method used with AJAX Call
        var myURL = "https://brucebauer.info/assets/ITEC3650/unitsconversion.php";

        /* AJAX calculator requires Operand1, Operator, and Operand2 */
        myURL = myURL + "?FromValue=" + encodeURIComponent(Operand1) + "&FromUnit=" + encodeURIComponent(FromUnit) + "&ToUnit=" + encodeURIComponent(ToUnit);

        /* fetch the results */
        let myCalcObject = await fetch(myURL);
        let myResult = await myCalcObject.text();
        
        document.getElementById("Result").innerHTML = myResult;
}

function clearform() {
    "use strict";
    
    /* Set all of the form values to blank or false */
    document.getElementById("Operand1").value = "";
    document.getElementById("Operand1Msg").innerHTML = "";

    document.getElementById("cmOperator").checked = false;
    document.getElementById("mOperator").checked = false;
    document.getElementById("kmOperator").checked = false;
    document.getElementById("inOperator").checked = false;
    document.getElementById("ftOperator").checked = false;
    document.getElementById("ydOperator").checked = false;
    document.getElementById("miOperator").checked = false;

    document.getElementById("To-cm-Operator").checked = false;
    document.getElementById("To-m-Operator").checked = false;
    document.getElementById("To-km-Operator").checked = false;
    document.getElementById("To-in-Operator").checked = false;
    document.getElementById("To-ft-Operator").checked = false;
    document.getElementById("To-yd-Operator").checked = false;
    document.getElementById("To-mi-Operator").checked = false;

    document.getElementById("fromMsg").innerHTML = "";
    document.getElementById("toMsg").innerHTML = "";
    
    document.getElementById("Result").innerHTML = "";
}

$( "#myform" ).validate({

});